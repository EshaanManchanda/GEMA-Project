import React from 'react';
import { Outlet } from 'react-router-dom';
import VendorNavigation from './VendorNavigation';

const VendorLayout: React.FC = () => {
    return (
        <>
            <VendorNavigation />
            <Outlet />
        </>
    );
};

export default VendorLayout;
