/**
 * Email Templates for Order Notifications
 * Templates for different order statuses
 */

export interface EmailTemplate {
  subject: string;
  html: string;
}

export const emailTemplates = {
  order_confirmation: (orderData: any): EmailTemplate => ({
    subject: `Order Confirmation - Order #${orderData.orderNumber || orderData._id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Dear Customer,</p>
        <p>Thank you for your order! Your order has been confirmed.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Order Details</h3>
          <p><strong>Order Number:</strong> ${orderData.orderNumber || orderData._id}</p>
          <p><strong>Order Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString('en-IN')}</p>
          <p><strong>Total Amount:</strong> ₹${orderData.totalAmount}</p>
          <p><strong>Delivery Fee:</strong> ₹${orderData.deliveryFee || 0}</p>
          <p><strong>Status:</strong> ${orderData.status || 'pending'}</p>
          <p><strong>Payment Method:</strong> ${orderData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
        </div>

        <h3>Shipping Address</h3>
        <p>
          ${orderData.shippingAddress?.street || ''}<br/>
          ${orderData.shippingAddress?.city || ''}, ${orderData.shippingAddress?.state || ''} ${orderData.shippingAddress?.pincode || ''}
        </p>

        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          If you have any questions, please contact our support team.<br/>
          Thank you for shopping with us!
        </p>
      </div>
    `,
  }),

  order_shipped: (orderData: any): EmailTemplate => ({
    subject: `Your Order is Shipped - Order #${orderData.orderNumber || orderData._id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Shipped 🚚</h2>
        <p>Dear Customer,</p>
        <p>Great news! Your order is on its way.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Order Details</h3>
          <p><strong>Order Number:</strong> ${orderData.orderNumber || orderData._id}</p>
          <p><strong>Status:</strong> Shipped</p>
          ${orderData.assignedRiderId ? `<p><strong>Rider:</strong> ${orderData.assignedRiderId.name || 'Assigned'}</p>` : ''}
          ${orderData.etaMinutes ? `<p><strong>Estimated Delivery:</strong> In ${orderData.etaMinutes} minutes</p>` : ''}
        </div>

        <h3>Shipping Address</h3>
        <p>
          ${orderData.shippingAddress?.street || ''}<br/>
          ${orderData.shippingAddress?.city || ''}, ${orderData.shippingAddress?.state || ''} ${orderData.shippingAddress?.pincode || ''}
        </p>

        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          Track your order in real-time through our app.<br/>
          Thank you for your patience!
        </p>
      </div>
    `,
  }),

  order_delivered: (orderData: any): EmailTemplate => ({
    subject: `Order Delivered - Order #${orderData.orderNumber || orderData._id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Delivered ✅</h2>
        <p>Dear Customer,</p>
        <p>Your order has been successfully delivered! We hope you enjoyed your shopping experience.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Order Details</h3>
          <p><strong>Order Number:</strong> ${orderData.orderNumber || orderData._id}</p>
          <p><strong>Status:</strong> Delivered</p>
          <p><strong>Delivered Date:</strong> ${new Date(orderData.updatedAt).toLocaleDateString('en-IN')}</p>
        </div>

        <p style="margin-top: 30px; color: #666; font-size: 12px;">
          If you have any concerns about your order, please don't hesitate to contact us.<br/>
          Thank you for choosing us!
        </p>
      </div>
    `,
  }),
};

/**
 * Get email template for a specific order type
 */
export const getEmailTemplate = (
  type: 'order_confirmation' | 'order_shipped' | 'order_delivered',
  orderData: any
): EmailTemplate => {
  const templateFunc = emailTemplates[type];
  
  if (!templateFunc) {
    console.warn(`⚠️ Email: Unknown email type: ${type}`);
    // Return a default template
    return {
      subject: `Order Update - Order #${orderData.orderNumber || orderData._id}`,
      html: `<p>Order update for #${orderData._id}</p>`,
    };
  }

  return templateFunc(orderData);
};
