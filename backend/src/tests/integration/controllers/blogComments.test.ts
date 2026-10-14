import "../setup/mocks";
import request from "supertest";
import { Application } from "express";
import { Types } from "mongoose";
import Comment from "../../../models/Comment";
import { Blog } from "../../../models/Blog";
import { createTestApp } from "../setup/testApp";
import { connectTestDB, clearTestDB, closeTestDB } from "../setup/testDB";
import { Session, cookie, signUp, signUpAdmin } from "../setup/session";

let app: Application;
beforeAll(async () => {
  await connectTestDB();
  app = createTestApp();
});
afterEach(clearTestDB);
afterAll(closeTestDB);

const send = (s: Session, method: "post" | "put" | "delete", url: string, body: object = {}) =>
  request(app)[method](url).set("Cookie", cookie(s)).set("x-csrf-token", s.csrfToken).send(body);

async function insertPost() {
  const _id = new Types.ObjectId();
  await Blog.collection.insertOne({
    _id,
    title: "Post",
    slug: `post-${_id}`,
    excerpt: "E",
    content: "C",
    category: new Types.ObjectId(),
    author: { name: "A", email: "a@example.com" },
    status: "published",
    readTime: 1,
    commentsCount: 0,
  });
  return String(_id);
}

async function postComment(s: Session, postId: string, content = "Great post!") {
  const res = await send(s, "post", `/api/blog/posts/${postId}/comments`, { content });
  return res.body.data.comment._id as string;
}

it("creates a pending comment, an admin approves it, and it becomes public", async () => {
  const postId = await insertPost();
  const me = await signUp(app, "customer");
  const admin = await signUpAdmin(app);

  const res = await send(me, "post", `/api/blog/posts/${postId}/comments`, { content: "Great post!" });
  expect(res.status).toBe(201);
  const id = res.body.data.comment._id;
  expect((await Comment.findById(id).lean())!.status).toBe("pending");
  expect((await Blog.findById(postId).lean())!.commentsCount).toBe(1);

  expect((await request(app).get(`/api/blog/posts/${postId}/comments`)).body.data.comments).toHaveLength(0);
  expect((await send(admin, "put", `/api/blog/comments/${id}/approve`)).status).toBe(200);
  expect((await request(app).get(`/api/blog/posts/${postId}/comments`)).body.data.comments).toHaveLength(1);
});

it("lets the author edit and delete their comment; others get 403", async () => {
  const postId = await insertPost();
  const me = await signUp(app, "customer");
  const other = await signUp(app, "customer");
  const id = await postComment(me, postId);

  expect((await send(other, "put", `/api/blog/comments/${id}`, { content: "Hijack" })).status).toBe(403);
  expect((await send(other, "delete", `/api/blog/comments/${id}`)).status).toBe(403);

  expect((await send(me, "put", `/api/blog/comments/${id}`, { content: "Edited" })).status).toBe(200);
  expect((await Comment.findById(id).lean())!).toMatchObject({ content: "Edited", isEdited: true });

  expect((await send(me, "delete", `/api/blog/comments/${id}`)).status).toBe(200);
  expect((await Comment.findById(id).lean())!.status).toBe("deleted");
});

it("toggles likes and accepts reports on active comments", async () => {
  const postId = await insertPost();
  const me = await signUp(app, "customer");
  const other = await signUp(app, "customer");
  const admin = await signUpAdmin(app);
  const id = await postComment(me, postId);

  expect((await send(other, "post", `/api/blog/comments/${id}/like`)).status).toBe(400); // still pending
  await send(admin, "put", `/api/blog/comments/${id}/approve`);

  expect((await send(other, "post", `/api/blog/comments/${id}/like`)).body.data).toMatchObject({ likes: 1, hasLiked: true });
  expect((await send(other, "post", `/api/blog/comments/${id}/dislike`)).body.data).toMatchObject({ likes: 0, dislikes: 1 });
  expect((await send(me, "post", `/api/blog/comments/${id}/report`, { reason: "self" })).status).toBe(400);
  expect((await send(other, "post", `/api/blog/comments/${id}/report`, { reason: "Spam" })).status).toBe(200);
});

it("returns 400 for empty content or a bad parent id, 404 for an unknown post", async () => {
  const postId = await insertPost();
  const me = await signUp(app, "customer");

  expect((await send(me, "post", `/api/blog/posts/${postId}/comments`, { content: "" })).status).toBe(400);
  expect((await send(me, "post", `/api/blog/posts/${postId}/comments`, { content: "x", parentComment: "bad" })).status).toBe(400);
  expect((await send(me, "post", `/api/blog/posts/${new Types.ObjectId()}/comments`, { content: "x" })).status).toBe(404);
  expect(await Comment.countDocuments()).toBe(0);
});

it("requires login to comment and admin to approve", async () => {
  const postId = await insertPost();
  const me = await signUp(app, "customer");
  const id = await postComment(me, postId);

  expect((await request(app).post(`/api/blog/posts/${postId}/comments`).send({ content: "anon" })).status).toBe(401);
  expect((await send(me, "put", `/api/blog/comments/${id}/approve`)).status).toBe(403);
  expect((await Comment.findById(id).lean())!.status).toBe("pending");
});

it("anonymous visitors cannot list unmoderated comments via ?status=pending", async () => {
  const postId = await insertPost();
  const me = await signUp(app, "customer");
  await postComment(me, postId, "unmoderated text");

  const res = await request(app).get(`/api/blog/posts/${postId}/comments?status=pending`);

  expect(JSON.stringify(res.body)).not.toContain("unmoderated text");
});

it("deleting an already-deleted comment does not decrement commentsCount again", async () => {
  const postId = await insertPost();
  const me = await signUp(app, "customer");
  const id = await postComment(me, postId);

  await send(me, "delete", `/api/blog/comments/${id}`);
  await send(me, "delete", `/api/blog/comments/${id}`);

  expect((await Blog.findById(postId).lean())!.commentsCount).toBe(0);
});

it("returns 400 for a malformed postId", async () => {
  expect((await request(app).get("/api/blog/posts/not-an-id/comments")).status).toBe(400);
});
