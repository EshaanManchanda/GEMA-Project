import React from 'react';
import CouponList from '../../components/admin/CouponList';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

const AdminCouponsPage: React.FC = () => {
  return (
    <>
      <PrivatePageSEO title="Admin - Coupons | Kidrove" description="Manage discount coupons" />
      <CouponList />
    </>
  );
};

export default AdminCouponsPage;