import mongoose from "mongoose";
import { collectionSyncService } from "../../../services/collection-sync.service";
import Collection from "../../../models/Collection";
import Event from "../../../models/Event";

jest.mock("../../../models/Collection");
jest.mock("../../../models/Event");
jest.mock("../../../config/logger");
jest.mock("../../../services/cache.service");

describe("CollectionSyncService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("reconcileAll", () => {
    it("should handle empty collection set", async () => {
      // Mock cursor with no results
      const mockCursor = {
        [Symbol.asyncIterator]: async function* () {
          // Empty iterator
        },
      };

      (Collection.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        cursor: jest.fn().mockReturnValue(mockCursor),
      });

      // Mock connection health check
      Object.defineProperty(mongoose.connection, "readyState", {
        value: 1,
        configurable: true,
      });
      Object.defineProperty(mongoose.connection, "db", {
        value: {
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockResolvedValue(true),
          }),
        },
        configurable: true,
      });

      const result = await collectionSyncService.reconcileAll();

      expect(result.total).toBe(0);
      expect(result.synced).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should process collections in batches", async () => {
      const cursorSpy = jest.fn();
      const mockCursor = {
        [Symbol.asyncIterator]: async function* () {
          // Empty iterator
        },
      };

      (Collection.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        cursor: cursorSpy.mockReturnValue(mockCursor),
      });

      // Mock connection health check
      Object.defineProperty(mongoose.connection, "readyState", {
        value: 1,
        configurable: true,
      });
      Object.defineProperty(mongoose.connection, "db", {
        value: {
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockResolvedValue(true),
          }),
        },
        configurable: true,
      });

      await collectionSyncService.reconcileAll();

      expect(cursorSpy).toHaveBeenCalledWith({ batchSize: 5 });
    });

    it("should continue on individual collection failure", async () => {
      // Mock 3 collections, 2nd one fails
      const collections = [
        { _id: "507f1f77bcf86cd799439011", title: "Test 1", events: [] },
        { _id: "507f1f77bcf86cd799439012", title: "Test 2", events: [] },
        { _id: "507f1f77bcf86cd799439013", title: "Test 3", events: [] },
      ];

      const mockCursor = {
        [Symbol.asyncIterator]: async function* () {
          for (const c of collections) {
            yield c;
          }
        },
      };

      (Collection.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        cursor: jest.fn().mockReturnValue(mockCursor),
      });

      // Mock connection health check
      Object.defineProperty(mongoose.connection, "readyState", {
        value: 1,
        configurable: true,
      });
      Object.defineProperty(mongoose.connection, "db", {
        value: {
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockResolvedValue(true),
          }),
        },
        configurable: true,
      });

      // Make 2nd collection sync fail
      jest
        .spyOn(collectionSyncService, "syncCollection")
        .mockResolvedValueOnce(1) // Success
        .mockRejectedValueOnce(new Error("Sync failed")) // Fail
        .mockResolvedValueOnce(1); // Success

      const result = await collectionSyncService.reconcileAll();

      expect(result.total).toBe(3);
      expect(result.synced).toBe(2);
      expect(result.failed).toBe(1);
    });

    it("should throw on MongoDB connection failure", async () => {
      // Mock disconnected state
      Object.defineProperty(mongoose.connection, "readyState", {
        value: 0,
        configurable: true,
      });

      await expect(collectionSyncService.reconcileAll()).rejects.toThrow(
        "MongoDB not connected",
      );
    });

    it("should log warning if reconciliation takes too long", async () => {
      const mockCursor = {
        [Symbol.asyncIterator]: async function* () {
          // Empty iterator
        },
      };

      (Collection.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        cursor: jest.fn().mockReturnValue(mockCursor),
      });

      // Mock connection health check
      Object.defineProperty(mongoose.connection, "readyState", {
        value: 1,
        configurable: true,
      });
      Object.defineProperty(mongoose.connection, "db", {
        value: {
          admin: jest.fn().mockReturnValue({
            ping: jest.fn().mockResolvedValue(true),
          }),
        },
        configurable: true,
      });

      // Mock Date.now to simulate 6 minutes elapsed
      const realDateNow = Date.now;
      let callCount = 0;
      jest.spyOn(Date, "now").mockImplementation(() => {
        callCount++;
        if (callCount === 1) return realDateNow(); // startTime
        return realDateNow() + 360000; // 6 minutes later
      });

      const result = await collectionSyncService.reconcileAll();

      expect(result.durationMs).toBeGreaterThanOrEqual(300000);

      jest.spyOn(Date, "now").mockRestore();
    });
  });

  describe("syncCollection", () => {
    it("should fetch events in parallel batches", async () => {
      const collection = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        title: "Test Collection",
        events: [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
        ], // 7 events
        eventsData: [],
        lastSyncedAt: new Date(),
        dataVersion: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      (Collection.findById as jest.Mock).mockResolvedValue(collection);

      const getEventSpy = jest
        .spyOn(collectionSyncService as any, "getEventDataForEmbed")
        .mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          title: "Test Event",
          isApproved: true,
          isActive: true,
          isDeleted: false,
        });

      await collectionSyncService.syncCollection("507f1f77bcf86cd799439011");

      // Should call getEventDataForEmbed 7 times (for 7 events)
      expect(getEventSpy).toHaveBeenCalledTimes(7);

      // Verify save was called
      expect(collection.save).toHaveBeenCalled();

      // Verify eventsData was populated
      expect(collection.eventsData.length).toBeGreaterThan(0);
    });

    it("should return null if collection not found", async () => {
      (Collection.findById as jest.Mock).mockResolvedValue(null);

      const result = await collectionSyncService.syncCollection(
        "507f1f77bcf86cd799439011",
      );

      expect(result).toBeNull();
    });

    it("should filter out unapproved and inactive events", async () => {
      const collection = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439011"),
        title: "Test Collection",
        events: [
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
          new mongoose.Types.ObjectId(),
        ],
        eventsData: [],
        lastSyncedAt: new Date(),
        dataVersion: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      (Collection.findById as jest.Mock).mockResolvedValue(collection);

      const getEventSpy = jest
        .spyOn(collectionSyncService as any, "getEventDataForEmbed")
        .mockResolvedValueOnce({
          _id: new mongoose.Types.ObjectId(),
          title: "Approved Event",
          isApproved: true,
          isActive: true,
          isDeleted: false,
        })
        .mockResolvedValueOnce({
          _id: new mongoose.Types.ObjectId(),
          title: "Unapproved Event",
          isApproved: false,
          isActive: true,
          isDeleted: false,
        })
        .mockResolvedValueOnce({
          _id: new mongoose.Types.ObjectId(),
          title: "Inactive Event",
          isApproved: true,
          isActive: false,
          isDeleted: false,
        });

      const result = await collectionSyncService.syncCollection(
        "507f1f77bcf86cd799439011",
      );

      // Only 1 event should be in eventsData (the approved and active one)
      expect(collection.eventsData.length).toBe(1);
      expect(result).toBe(1);
    });
  });

  describe("syncEventToCollections", () => {
    it("should auto-link matching active collections by category or type", async () => {
      const eventId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");
      const autoLinkedCollection = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439099"),
        title: "Kidrove Activity Collections",
        category: "Activities",
        slug: "kidrove-activity-collections",
        events: [],
        eventsData: [],
        lastSyncedAt: new Date(),
        dataVersion: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      const manualCollection = {
        _id: new mongoose.Types.ObjectId("507f1f77bcf86cd799439088"),
        title: "Manual Picks",
        category: "Featured",
        slug: "manual-picks",
        events: [eventId],
        eventsData: [
          {
            _id: eventId,
            title: "Existing Event",
          },
        ],
        lastSyncedAt: new Date(),
        dataVersion: 1,
        save: jest.fn().mockResolvedValue(true),
      };

      (Collection.find as jest.Mock).mockImplementation((query) => {
        if (query?.events) {
          return Promise.resolve([manualCollection]);
        }

        if (query?.isActive) {
          return {
            select: jest
              .fn()
              .mockResolvedValue([manualCollection, autoLinkedCollection]),
          };
        }

        return Promise.resolve([]);
      });

      (Event.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          _id: eventId,
          title: "Summer Workshop",
          category: "Workshop",
          type: "Workshop",
          isApproved: true,
          isActive: true,
          isDeleted: false,
        }),
      });

      const result = await collectionSyncService.syncEventToCollections(
        eventId.toString(),
      );

      expect(result.updated).toBe(2);
      expect(manualCollection.save).toHaveBeenCalled();
      expect(autoLinkedCollection.events.some((id: any) => id.toString() === eventId.toString())).toBe(true);
      expect(autoLinkedCollection.save).toHaveBeenCalled();
    });
  });
});
