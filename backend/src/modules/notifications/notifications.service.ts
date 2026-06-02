import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  shippingAddress: string;
}

export interface OrderStatusChangeData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  previousStatus: string;
  newStatus: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      this.logger.log('Email transporter initialized');
    } else {
      this.logger.warn('SMTP not configured - emails will be logged only');
    }
  }

  async sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
    const subject = `Confirmación de Pedido #${data.orderNumber} - Crazy Cookies`;

    const itemsList = data.items
      .map((item) => `• ${item.name} x${item.quantity} - $${item.price.toLocaleString('es-CO')}`)
      .join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .order-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .total { font-size: 24px; font-weight: bold; color: #3b82f6; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          .whatsapp-btn { display: inline-block; background: #25d366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍪 Crazy Cookies</h1>
            <p>¡Gracias por tu pedido!</p>
          </div>
          <div class="content">
            <h2>Hola ${data.customerName},</h2>
            <p>Hemos recibido tu pedido correctamente. Aquí están los detalles:</p>

            <div class="order-details">
              <h3>Pedido #${data.orderNumber}</h3>
              <p><strong>Productos:</strong></p>
              <pre>${itemsList}</pre>
              <hr>
              <p>Subtotal: $${data.subtotal.toLocaleString('es-CO')}</p>
              <p>IVA (19%): $${data.tax.toLocaleString('es-CO')}</p>
              <p class="total">Total: $${data.total.toLocaleString('es-CO')}</p>
            </div>

            <div class="order-details">
              <h3>Dirección de Entrega</h3>
              <p>${data.shippingAddress}</p>
            </div>

            <p>Te notificaremos cuando tu pedido esté listo.</p>

            <a href="https://wa.me/573001234567?text=Hola,%20mi%20pedido%20es%20${data.orderNumber}" class="whatsapp-btn">
              📱 Contactar por WhatsApp
            </a>
          </div>
          <div class="footer">
            <p>Crazy Cookies - Las mejores galletas artesanales</p>
            <p>Este es un correo automático, no responder.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(data.customerEmail, subject, html);
  }

  async sendOrderStatusUpdate(data: OrderStatusChangeData): Promise<boolean> {
    const statusMessages: Record<string, string> = {
      CONFIRMED: '✅ Tu pedido ha sido confirmado y está siendo preparado.',
      IN_PROCESS: '👨‍🍳 Tu pedido está siendo preparado con mucho amor.',
      READY: '🎉 ¡Tu pedido está listo para entrega!',
      DELIVERED: '✅ Tu pedido ha sido entregado. ¡Disfrútalo!',
      CANCELLED: '❌ Tu pedido ha sido cancelado.',
    };

    const subject = `Actualización de Pedido #${data.orderNumber} - Crazy Cookies`;
    const statusMessage =
      statusMessages[data.newStatus] || `Estado actualizado a: ${data.newStatus}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .status-box { background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .status-text { font-size: 20px; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍪 Crazy Cookies</h1>
            <p>Actualización de tu pedido</p>
          </div>
          <div class="content">
            <h2>Hola ${data.customerName},</h2>

            <div class="status-box">
              <p>Pedido #${data.orderNumber}</p>
              <p class="status-text">${statusMessage}</p>
            </div>

            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          </div>
          <div class="footer">
            <p>Crazy Cookies - Las mejores galletas artesanales</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(data.customerEmail, subject, html);
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const fromEmail = this.configService.get<string>('SMTP_FROM') || 'noreply@crazycookies.com';

    if (!this.transporter) {
      this.logger.log(`[EMAIL LOG] To: ${to}`);
      this.logger.log(`[EMAIL LOG] Subject: ${subject}`);
      this.logger.log('[EMAIL LOG] Email would be sent (SMTP not configured)');
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: `"Crazy Cookies" <${fromEmail}>`,
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  generateWhatsAppLink(orderNumber: string, _phone: string): string {
    const businessPhone = this.configService.get<string>('WHATSAPP_PHONE') || '573001234567';
    const message = encodeURIComponent(`Hola, tengo una consulta sobre mi pedido #${orderNumber}`);
    return `https://wa.me/${businessPhone}?text=${message}`;
  }
}
