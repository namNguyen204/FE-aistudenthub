import api from './api';

const paymentService = {
  getPackages: async () => {
    const response = await api.get('/payment/packages');
    return response.data?.data || [];
  },
  getPricingPlans: async () => {
    const response = await api.get('/pricing-plans');
    return response.data?.data || [];
  },

  createPayment: async (amount, description, returnUrl, cancelUrl) => {
    const response = await api.post('/payment/create', {
      amount,
      description,
      returnUrl,
      cancelUrl
    });
    return response.data?.data;
  },

  createPaymentByPlan: async (
    planId,
    returnUrl,
    cancelUrl
  ) => {
    const response = await api.post('/payment/create', {
      planId,
      returnUrl,
      cancelUrl
    });

    return response.data?.data;
  },

  getPaymentDetail: async (orderCode) => {
    const response = await api.get(`/payment/${orderCode}`);
    return response.data?.data;
  },

  getMyPayments: async () => {
    const response = await api.get('/payment/my');
    return response.data?.data || [];
  },

  cancelPayment: async (orderCode) => {
    const response = await api.post(`/payment/${orderCode}/cancel`);
    return response.data?.data;
  }
};

export default paymentService;
