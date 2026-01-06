import React from 'react';
import BlogCategoryManager from '../../components/admin/BlogCategoryManager';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

const AdminBlogCategoriesPage: React.FC = () => {
  return (
    <>
      <PrivatePageSEO title="Admin - Blog Categories | Kidrove" description="Manage blog categories" />
      <BlogCategoryManager />
    </>
  );
};

export default AdminBlogCategoriesPage;