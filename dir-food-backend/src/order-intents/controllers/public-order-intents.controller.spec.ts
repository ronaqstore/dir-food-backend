import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicOrderIntentsController } from './public-order-intents.controller.js';
import { OrderIntentsService } from '../services/order-intents.service.js';

describe('PublicOrderIntentsController', () => {
  let controller: PublicOrderIntentsController;
  let service: any;

  beforeEach(() => {
    service = {
      createOrderIntent: vi.fn(),
      recordWhatsAppOpened: vi.fn(),
      getPublicOrderIntent: vi.fn(),
    };
    controller = new PublicOrderIntentsController(service as OrderIntentsService);
  });

  it('delegates order intent creation to service with client IP', async () => {
    service.createOrderIntent.mockResolvedValue({ reference: 'TM-7K4P9Q' });

    const dto: any = { clientRequestId: 'req-1', restaurantSlug: 'hotel-al-noor' };
    const res = await controller.createOrderIntent(dto, '192.168.1.1');

    expect(service.createOrderIntent).toHaveBeenCalledWith(dto, '192.168.1.1');
    expect(res).toEqual({ reference: 'TM-7K4P9Q' });
  });

  it('delegates recordWhatsAppOpened to service', async () => {
    service.recordWhatsAppOpened.mockResolvedValue({ status: 'WHATSAPP_OPENED' });

    const res = await controller.recordWhatsAppOpened('TM-7K4P9Q');
    expect(service.recordWhatsAppOpened).toHaveBeenCalledWith('TM-7K4P9Q');
    expect(res).toEqual({ status: 'WHATSAPP_OPENED' });
  });

  it('delegates getPublicOrderIntent to service', async () => {
    service.getPublicOrderIntent.mockResolvedValue({ reference: 'TM-7K4P9Q' });

    const res = await controller.getPublicOrderIntent('TM-7K4P9Q');
    expect(service.getPublicOrderIntent).toHaveBeenCalledWith('TM-7K4P9Q');
    expect(res).toEqual({ reference: 'TM-7K4P9Q' });
  });
});

