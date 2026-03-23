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

  password_reset: (userData: any): EmailTemplate => ({
    subject: `Password Reset Notification - ${userData.appName || 'Lakhanmajra Delivery'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">🔐 Password Reset Notification</h2>
        <p>Dear ${userData.name || 'User'},</p>
        
        ${
          userData.isAdminReset
            ? `<p style="color: #d32f2f; font-weight: bold;">Your password has been reset by an administrator.</p>
               <p>You should have received a temporary password or reset link. Please use it to log in and change your password.</p>`
            : `<p>Your password has been successfully changed.</p>
               <p>If you did not make this change, please contact support immediately.</p>`
        }
        
        <div style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #e65100;">Security Tips:</h3>
          <ul style="color: #666;">
            <li>Never share your password with anyone</li>
            <li>Use a strong, unique password (8+ characters with letters, numbers, and symbols)</li>
            <li>Change your password regularly for enhanced security</li>
            <li>Log out of all sessions after password change</li>
          </ul>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Account Details</h3>
          <p><strong>Email:</strong> ${userData.email || 'N/A'}</p>
          <p><strong>Role:</strong> ${userData.role || 'User'}</p>
          <p><strong>Updated At:</strong> ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}</p>
        </div>

        ${
          userData.isAdminReset
            ? `<p style="color: #d32f2f;"><strong>⚠️ Action Required:</strong> Please log in and change your password as soon as possible.</p>`
            : `<p style="color: #388e3c;"><strong>✓ Your account is secure.</strong> If this wasn't you, change your password immediately and contact support.</p>`
        }

        <p style="margin-top: 30px; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 15px;">
          ${userData.appName || 'Lakhanmajra Delivery'} - Security Team<br/>
          If you have any questions or concerns, please contact our support team.<br/>
          <strong>Do not reply to this email. Use the contact form on our website.</strong>
        </p>
      </div>
    `,
  }),
};

/**
 * Get email template for a specific type
 */
export const getEmailTemplate = (
  type: 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'password_reset',
  data: any
): EmailTemplate => {
  const templateFunc = emailTemplates[type];
  
  if (!templateFunc) {
    console.warn(`⚠️ Email: Unknown email type: ${type}`);
    // Return a default template
    return {
      subject: `Notification - ${type}`,
      html: `<p>Notification: ${type}</p>`,
    };
  }

  return templateFunc(data);
};
