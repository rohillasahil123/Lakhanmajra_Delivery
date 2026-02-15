import { connectRabbitMQ, getChannel } from '../../config/rabbitmq';
import connectDB from '../../config/mongo';
import { EmailQueueMessage } from '../../types';

async function startEmailWorker(): Promise<void> {
  await connectDB();
  await connectRabbitMQ();
  const channel = getChannel();
  
  console.log('📧 Email Worker started...');
  
  channel.consume('email_queue', async (msg) => {
    if (msg) {
      try {
        const { orderId, type }: EmailQueueMessage = JSON.parse(msg.content.toString());
        
        console.log(`📨 Sending ${type} email for order: ${orderId}`);
        // TODO: Nodemailer integration yaha add kar sakte ho
        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`✅ Email sent for order: ${orderId}`);
        
        channel.ack(msg);
      } catch (error) {
        console.error('❌ Email sending error:', error);
        channel.nack(msg, false, true); // Requeue
      }
    }
  });
}

startEmailWorker().catch(console.error);
