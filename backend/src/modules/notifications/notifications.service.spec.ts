import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import {
  NotificationsService,
  OrderConfirmationData,
  OrderStatusChangeData,
} from './notifications.service';

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

describe('NotificationsService', () => {
  let service: NotificationsService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let configValues: Record<string, any>;

  const mockConfigService = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, security/detect-object-injection -- test mock, key comes from ConfigService.get() call sites, not external input
    get: jest.fn((key: string): any => configValues[key]),
  };

  const createService = async (): Promise<NotificationsService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationsService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    return module.get<NotificationsService>(NotificationsService);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with SMTP configured', () => {
    beforeEach(async () => {
      configValues = {
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: 587,
        SMTP_USER: 'user@example.com',
        SMTP_PASS: 'secret',
        SMTP_FROM: 'noreply@crazycookies.com',
      };
      service = await createService();
    });

    it('should initialize the transporter with the correct SMTP config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'user@example.com', pass: 'secret' },
      });
    });

    it('should send order confirmation email with correct params', async () => {
      mockSendMail.mockResolvedValue(true);

      const data: OrderConfirmationData = {
        orderNumber: '123',
        customerName: 'Juan',
        customerEmail: 'juan@example.com',
        customerPhone: '3001234567',
        items: [{ name: 'Galleta de Chispas', quantity: 2, price: 5000 }],
        subtotal: 10000,
        tax: 1900,
        total: 11900,
        shippingAddress: 'Calle 1 # 2-3',
      };

      const result = await service.sendOrderConfirmation(data);

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.to).toBe('juan@example.com');
      expect(callArg.from).toBe('"Crazy Cookies" <noreply@crazycookies.com>');
      expect(callArg.subject).toContain('123');
      expect(callArg.html).toContain('Juan');
      expect(callArg.html).toContain('Galleta de Chispas');
      expect(callArg.html).toContain('Calle 1 # 2-3');
    });

    it('should send order status update email with correct params', async () => {
      mockSendMail.mockResolvedValue(true);

      const data: OrderStatusChangeData = {
        orderNumber: '456',
        customerName: 'Maria',
        customerEmail: 'maria@example.com',
        previousStatus: 'PENDING',
        newStatus: 'CONFIRMED',
      };

      const result = await service.sendOrderStatusUpdate(data);

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.to).toBe('maria@example.com');
      expect(callArg.subject).toContain('456');
      expect(callArg.html).toContain('confirmado');
    });

    it('should fall back to a default message for an unknown status', async () => {
      mockSendMail.mockResolvedValue(true);

      await service.sendOrderStatusUpdate({
        orderNumber: '999',
        customerName: 'Ana',
        customerEmail: 'ana@example.com',
        previousStatus: 'PENDING',
        newStatus: 'UNKNOWN_STATUS',
      });

      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).toContain('Estado actualizado a: UNKNOWN_STATUS');
    });

    it('should return false when sending the email fails', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection error'));

      const result = await service.sendOrderStatusUpdate({
        orderNumber: '789',
        customerName: 'Pedro',
        customerEmail: 'pedro@example.com',
        previousStatus: 'PENDING',
        newStatus: 'CANCELLED',
      });

      expect(result).toBe(false);
    });
  });

  describe('without SMTP configured', () => {
    beforeEach(async () => {
      configValues = {};
      service = await createService();
    });

    it('should not create a transporter', () => {
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });

    it('should log the email and return true instead of sending it', async () => {
      const result = await service.sendOrderConfirmation({
        orderNumber: '111',
        customerName: 'Luis',
        customerEmail: 'luis@example.com',
        customerPhone: '3009999999',
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        shippingAddress: 'N/A',
      });

      expect(result).toBe(true);
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe('generateWhatsAppLink', () => {
    beforeEach(async () => {
      configValues = {};
      service = await createService();
    });

    it('should generate a link with the default business phone and encoded message', () => {
      const link = service.generateWhatsAppLink('ORD-001', '3000000000');

      expect(link).toBe(
        'https://wa.me/573001234567?text=' +
          encodeURIComponent('Hola, tengo una consulta sobre mi pedido #ORD-001'),
      );
    });

    it('should use the configured WHATSAPP_PHONE when set', () => {
      configValues = { WHATSAPP_PHONE: '573009999999' };

      const link = service.generateWhatsAppLink('ORD-002', '3000000000');

      expect(link).toContain('https://wa.me/573009999999?text=');
      expect(link).toContain(encodeURIComponent('#ORD-002'));
    });
  });
});
