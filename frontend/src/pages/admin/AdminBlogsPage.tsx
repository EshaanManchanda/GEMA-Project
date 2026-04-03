import React from 'react';
import BlogList from '../../components/admin/BlogList';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

const AdminBlogsPage: React.FC = () => {
  return (
    <>
      <PrivatePageSEO title="Admin - Blogs | Kidrove" description="Manage blog posts" />
      <BlogList />
    </>
  );
};

export default AdminBlogsPage;