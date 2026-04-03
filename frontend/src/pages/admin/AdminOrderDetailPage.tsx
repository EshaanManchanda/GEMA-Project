import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import adminAPI from '../../services/api/adminAPI';
import { IOrder, IParticipant, IRegistrationField } from '../../types/order';
import {
    ArrowLeft, Check, X, DollarSign, RefreshCw,
    Package, User, CreditCard, MapPin, Calendar,
    Clock, Tag, AlertCircle, CheckCircle, XCircle,
    Users, ChevronDown, ChevronUp, Phone, Heart
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';
import logger from '@/utils/logger';

const AdminOrderDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    useNavigate();

    const [order, setOrder] = useState<IOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set());

    // Action modal state
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<'confirm' | 'cancel' | 'refund' | null>(null);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchOrder = async () => {
        if (!id) return;
        try {
            setIsLoading(true);
            setError(null);
            const data = await adminAPI.getOrderById(id);
            // Backend: {success, data: {order: {...}}}
            setOrder(data?.data?.order || data?.order || data);
        } catch (err: any) {
            logger.error('Error fetching order:', err);
            setError(err?.response?.data?.message || 'Failed to load order');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const handleAction = (type: 'confirm' | 'cancel' | 'refund') => {
        setActionType(type);
        setRefundAmount('');
        setRefundReason('');
        setIsActionModalOpen(true);
    };

    const handleActionConfirm = async () => {
        if (!id || !actionType) return;
        setIsSubmitting(true);
        try {
            switch (actionType) {
                case 'confirm':
                    await adminAPI.confirmOrder(id);
                    toast.success('Order confirmed successfully');
                    break;
                case 'cancel':
                    await adminAPI.updateOrder(id, { status: 'cancelled' });
                    toast.success('Order cancelled successfully');
                    break;
                case 'refund':
                    const amount = refundAmount ? parseFloat(refundAmount) : undefined;
                    await adminAPI.refundOrder(id, amount, refundReason);
                    toast.success('Order refunded successfully');
                    break;
            }
            setIsActionModalOpen(false);
            await fetchOrder();
        } catch (err: any) {
            logger.error('Error performing action:', err);
            toast.error(err?.response?.data?.message || `Failed to ${actionType} order`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (date: string | Date | undefined) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const formatCurrency = (amount: number | undefined, currency = 'AED') => {
        if (amount === undefined || amount === null) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    };

    const getStatusColor = (status: IOrder['status']) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            case 'refunded': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getPaymentStatusColor = (status: IOrder['paymentStatus']) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'failed': return 'bg-red-100 text-red-800 border-red-200';
            case 'refunded': return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: IOrder['status']) => {
        switch (status) {
            case 'confirmed': return <CheckCircle className="w-4 h-4" />;
            case 'cancelled': return <XCircle className="w-4 h-4" />;
            case 'pending': return <Clock className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    const toggleParticipant = (key: string) => {
        setExpandedParticipants(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const renderFieldValue = (field: IRegistrationField): string => {
        const { value, fieldType } = field;
        if (value === null || value === undefined || value === '') return '—';
        if (Array.isArray(value)) return value.join(', ');
        if (fieldType === 'checkbox') return value ? 'Yes' : 'No';
        return String(value);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="max-w-4xl mx-auto py-12 text-center">
                <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
                <p className="text-gray-500 mb-6">{error || 'This order does not exist or could not be loaded.'}</p>
                <Link to="/admin/orders" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Orders
                </Link>
            </div>
        );
    }

    return (
        <>
            <PrivatePageSEO title={`Order ${order.orderNumber} | Admin`} description="Order details" />
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/admin/orders"
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderNumber}</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Placed on {formatDate(order.createdAt)}</p>
                        </div>
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${getPaymentStatusColor(order.paymentStatus)}`}>
                            <CreditCard className="w-4 h-4" />
                            {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                    {order.status === 'pending' && (
                        <button
                            onClick={() => handleAction('confirm')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                            <Check className="w-4 h-4" /> Confirm Order
                        </button>
                    )}
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                        <button
                            onClick={() => handleAction('cancel')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                            <X className="w-4 h-4" /> Cancel Order
                        </button>
                    )}
                    {order.paymentStatus === 'paid' && order.status !== 'refunded' && (
                        <button
                            onClick={() => handleAction('refund')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                        >
                            <DollarSign className="w-4 h-4" /> Issue Refund
                        </button>
                    )}
                    <button
                        onClick={fetchOrder}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left column: Items + Timeline */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Order Items */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                <Package className="w-5 h-5 text-gray-400" />
                                <h2 className="font-semibold text-gray-900">Order Items</h2>
                                <span className="ml-auto text-sm text-gray-500">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {order.items.map((item, idx) => (
                                    <div key={item._id || idx} className="px-6 py-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{item.eventTitle}</p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {formatDate(item.scheduleDate)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Tag className="w-3.5 h-3.5" />
                                                        Qty: {item.quantity}
                                                    </span>
                                                    <span>Unit: {formatCurrency(item.unitPrice, item.currency)}</span>
                                                </div>
                                                {item.participants && item.participants.length > 0 && (
                                                    <div className="mt-1.5">
                                                        <span className="inline-flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                            <Users className="w-3 h-3" />
                                                            {item.participants.length} participant{item.participants.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-semibold text-gray-900">{formatCurrency(item.totalPrice, item.currency)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Participants & Registration Data */}
                        {order.items.some(item => item.participants && item.participants.length > 0) && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-gray-400" />
                                    <h2 className="font-semibold text-gray-900">Participants & Registration Data</h2>
                                    <span className="ml-auto text-sm text-gray-500">
                                        {order.items.reduce((n, item) => n + (item.participants?.length || 0), 0)} total
                                    </span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {order.items.map((item, itemIdx) =>
                                        (item.participants || []).map((p: IParticipant, pIdx: number) => {
                                            const key = `${itemIdx}-${pIdx}`;
                                            const isExpanded = expandedParticipants.has(key);
                                            const hasExtra = !!(
                                                (p.registrationData && p.registrationData.length > 0) ||
                                                (p.allergies && p.allergies.length > 0) ||
                                                (p.medicalConditions && p.medicalConditions.length > 0) ||
                                                p.emergencyContact ||
                                                p.specialRequirements
                                            );
                                            return (
                                                <div key={key} className="px-6 py-4">
                                                    {/* Participant header */}
                                                    <div
                                                        className={`flex items-center justify-between ${hasExtra ? 'cursor-pointer' : ''}`}
                                                        onClick={() => hasExtra && toggleParticipant(key)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold shrink-0">
                                                                {pIdx + 1}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-900">{p.name || '—'}</p>
                                                                <p className="text-xs text-gray-500 mt-0.5">
                                                                    {[
                                                                        p.age ? `Age ${p.age}` : null,
                                                                        p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : null,
                                                                    ].filter(Boolean).join(' · ')}
                                                                    {order.items.length > 1 && (
                                                                        <span className="ml-2 text-indigo-500">{item.eventTitle}</span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {hasExtra && (
                                                            <button className="p-1 text-gray-400 hover:text-gray-600">
                                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Expanded detail */}
                                                    {isExpanded && (
                                                        <div className="mt-4 space-y-4 pl-11">
                                                            {/* Dynamic registration form fields */}
                                                            {p.registrationData && p.registrationData.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Registration Form</p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                                                                        {p.registrationData.map((field: IRegistrationField) => (
                                                                            <div key={field.fieldId} className="text-sm">
                                                                                <span className="text-gray-500">{field.fieldLabel}</span>
                                                                                <p className="font-medium text-gray-900 mt-0.5 break-words">
                                                                                    {renderFieldValue(field)}
                                                                                </p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Allergies */}
                                                            {p.allergies && p.allergies.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                                                        <Heart className="w-3 h-3" /> Allergies
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {p.allergies.map((a, i) => (
                                                                            <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{a}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Medical Conditions */}
                                                            {p.medicalConditions && p.medicalConditions.length > 0 && (
                                                                <div>
                                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Medical Conditions</p>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {p.medicalConditions.map((m, i) => (
                                                                            <span key={i} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{m}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Emergency Contact */}
                                                            {p.emergencyContact && (
                                                                <div>
                                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                                                                        <Phone className="w-3 h-3" /> Emergency Contact
                                                                    </p>
                                                                    <div className="text-sm space-y-0.5">
                                                                        <p className="font-medium text-gray-900">{p.emergencyContact.name}</p>
                                                                        <p className="text-gray-500">{p.emergencyContact.relationship} · {p.emergencyContact.phone}</p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Special Requirements */}
                                                            {p.specialRequirements && (
                                                                <div>
                                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Special Requirements</p>
                                                                    <p className="text-sm text-gray-700">{p.specialRequirements}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Quick preview of first few form fields when collapsed */}
                                                    {!isExpanded && p.registrationData && p.registrationData.length > 0 && (
                                                        <div className="mt-2 pl-11 flex flex-wrap gap-x-4 gap-y-1">
                                                            {p.registrationData.slice(0, 3).map((field: IRegistrationField) => (
                                                                <span key={field.fieldId} className="text-xs text-gray-500">
                                                                    <span className="text-gray-400">{field.fieldLabel}:</span>{' '}
                                                                    <span className="text-gray-700">{renderFieldValue(field)}</span>
                                                                </span>
                                                            ))}
                                                            {p.registrationData.length > 3 && (
                                                                <span className="text-xs text-indigo-500 cursor-pointer" onClick={() => toggleParticipant(key)}>
                                                                    +{p.registrationData.length - 3} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payment Summary */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-gray-400" />
                                <h2 className="font-semibold text-gray-900">Payment Summary</h2>
                            </div>
                            <div className="px-6 py-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span className="text-gray-900">{formatCurrency(order.subtotal, order.currency)}</span>
                                </div>
                                {order.tax > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Tax</span>
                                        <span className="text-gray-900">{formatCurrency(order.tax, order.currency)}</span>
                                    </div>
                                )}
                                {order.serviceFee !== undefined && order.serviceFee > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Service Fee</span>
                                        <span className="text-gray-900">{formatCurrency(order.serviceFee, order.currency)}</span>
                                    </div>
                                )}
                                {order.discount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Discount</span>
                                        <span className="text-green-600">-{formatCurrency(order.discount, order.currency)}</span>
                                    </div>
                                )}
                                {order.couponCode && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Coupon ({order.couponCode})</span>
                                        <span className="text-green-600">-{formatCurrency(order.couponDiscount, order.currency)}</span>
                                    </div>
                                )}
                                <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold">
                                    <span className="text-gray-900">Total</span>
                                    <span className="text-gray-900 text-lg">{formatCurrency(order.total, order.currency)}</span>
                                </div>

                                {/* Payment method */}
                                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                                    {order.paymentMethod && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Payment Method</span>
                                            <span className="text-gray-900 capitalize">{order.paymentMethod}</span>
                                        </div>
                                    )}
                                    {order.transactionId && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Transaction ID</span>
                                            <span className="text-gray-900 font-mono text-xs">{order.transactionId}</span>
                                        </div>
                                    )}
                                    {order.paymentIntentId && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Payment Intent</span>
                                            <span className="text-gray-900 font-mono text-xs truncate max-w-[180px]">{order.paymentIntentId}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Refund info */}
                                {order.refundAmount !== undefined && order.refundAmount > 0 && (
                                    <div className="border-t border-orange-100 pt-3 bg-orange-50 -mx-6 px-6 pb-4 rounded-b-xl">
                                        <p className="text-sm font-medium text-orange-800 mb-1">Refund Issued</p>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-orange-700">Amount</span>
                                            <span className="text-orange-900 font-semibold">{formatCurrency(order.refundAmount, order.currency)}</span>
                                        </div>
                                        {order.refundReason && (
                                            <p className="text-xs text-orange-700 mt-1">Reason: {order.refundReason}</p>
                                        )}
                                        {order.refundedAt && (
                                            <p className="text-xs text-orange-600 mt-0.5">Refunded on {formatDate(order.refundedAt)}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Admin Commission */}
                        {order.adminCommission && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h2 className="font-semibold text-gray-900">Commission & Revenue</h2>
                                </div>
                                <div className="px-6 py-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Commission Rate</span>
                                        <span className="text-gray-900">{order.adminCommission.rate}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Commission Amount</span>
                                        <span className="text-gray-900 font-medium">{formatCurrency(order.adminCommission.amount, order.currency)}</span>
                                    </div>
                                    {order.paymentRouting && (
                                        <>
                                            {order.paymentRouting.vendorPayout !== undefined && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Vendor Payout</span>
                                                    <span className="text-gray-900">{formatCurrency(order.paymentRouting.vendorPayout, order.currency)}</span>
                                                </div>
                                            )}
                                            {order.paymentRouting.usesVendorStripe && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Payment Routing</span>
                                                    <span className="text-gray-900">Vendor Stripe</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right column: Customer + Billing + Meta */}
                    <div className="space-y-6">

                        {/* Customer / Billing */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                <User className="w-5 h-5 text-gray-400" />
                                <h2 className="font-semibold text-gray-900">Customer</h2>
                            </div>
                            <div className="px-6 py-4 space-y-2 text-sm">
                                <p className="font-medium text-gray-900">
                                    {order.billingAddress.firstName} {order.billingAddress.lastName}
                                </p>
                                <p className="text-gray-600">{order.billingAddress.email}</p>
                                <p className="text-gray-600">{order.billingAddress.phone}</p>
                            </div>
                        </div>

                        {/* Billing Address */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-gray-400" />
                                <h2 className="font-semibold text-gray-900">Billing Address</h2>
                            </div>
                            <div className="px-6 py-4 text-sm text-gray-600 space-y-0.5">
                                <p>{order.billingAddress.address}</p>
                                <p>{order.billingAddress.city}{order.billingAddress.state ? `, ${order.billingAddress.state}` : ''} {order.billingAddress.zipCode}</p>
                                <p>{order.billingAddress.country}</p>
                            </div>
                        </div>

                        {/* Order Meta */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="font-semibold text-gray-900">Order Info</h2>
                            </div>
                            <div className="px-6 py-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Order ID</span>
                                    <span className="text-gray-900 font-mono text-xs">{order._id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Source</span>
                                    <span className="text-gray-900 capitalize">{order.source}</span>
                                </div>
                                {order.affiliateCode && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Affiliate</span>
                                        <span className="text-gray-900">{order.affiliateCode}</span>
                                    </div>
                                )}
                                {order.confirmedAt && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Confirmed At</span>
                                        <span className="text-gray-900">{formatDate(order.confirmedAt)}</span>
                                    </div>
                                )}
                                {order.cancelledAt && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Cancelled At</span>
                                        <span className="text-gray-900">{formatDate(order.cancelledAt)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Last Updated</span>
                                    <span className="text-gray-900">{formatDate(order.updatedAt)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {(order.notes || order.specialRequests) && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h2 className="font-semibold text-gray-900">Notes</h2>
                                </div>
                                <div className="px-6 py-4 text-sm text-gray-600 space-y-2">
                                    {order.notes && <p>{order.notes}</p>}
                                    {order.specialRequests && (
                                        <div>
                                            <p className="font-medium text-gray-700 mb-1">Special Requests:</p>
                                            <p>{order.specialRequests}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Modal */}
            {isActionModalOpen && actionType && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {actionType === 'confirm' ? 'Confirm Order' : actionType === 'cancel' ? 'Cancel Order' : 'Issue Refund'}
                        </h3>
                        <p className="text-gray-600 mb-6 text-sm">
                            {actionType === 'confirm' && 'This will confirm the order and send tickets to the customer.'}
                            {actionType === 'cancel' && 'Are you sure you want to cancel this order? This cannot be undone.'}
                            {actionType === 'refund' && 'Enter refund details below. Leave amount empty for a full refund.'}
                        </p>

                        {actionType === 'refund' && (
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Refund Amount (optional — leave empty for full refund)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={refundAmount}
                                        onChange={(e) => setRefundAmount(e.target.value)}
                                        placeholder={`Max: ${formatCurrency(order.total, order.currency)}`}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                                    <textarea
                                        value={refundReason}
                                        onChange={(e) => setRefundReason(e.target.value)}
                                        placeholder="Enter reason for refund..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-900"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsActionModalOpen(false)}
                                disabled={isSubmitting}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleActionConfirm}
                                disabled={isSubmitting}
                                className={`px-4 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50 ${actionType === 'confirm' ? 'bg-green-600 hover:bg-green-700' :
                                        actionType === 'cancel' ? 'bg-red-600 hover:bg-red-700' :
                                            'bg-orange-600 hover:bg-orange-700'
                                    }`}
                            >
                                {isSubmitting ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminOrderDetailPage;
