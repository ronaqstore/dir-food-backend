import { describe, it, expect } from 'vitest';
import { WhatsappMessageService } from './whatsapp-message.service.js';

describe('WhatsappMessageService', () => {
  const service = new WhatsappMessageService();

  it('builds a complete WhatsApp message with all optional fields', () => {
    const message = service.buildMessage({
      restaurantName: 'Hotel Al-Noor',
      restaurantWhatsapp: '03001234567',
      reference: 'TM-7K4P9Q',
      items: [
        {
          name: 'Chicken Karahi',
          variant: 'Full',
          unitPrice: 110000n,
          quantity: 1,
          lineTotal: 110000n,
        },
        {
          name: 'Naan',
          variant: null,
          unitPrice: 3000n,
          quantity: 4,
          lineTotal: 12000n,
        },
      ],
      subtotal: 122000n,
      deliveryFee: 10000n,
      customerName: 'Ahmad Khan',
      customerPhone: '03001234567',
      areaName: 'Timergara',
      landmark: 'Near Girls Degree College gate',
      directions: 'Blue gate, 2nd house on left',
      mapLat: 34.8265,
      mapLng: 71.8412,
    });

    expect(message).toContain('Assalam o Alaikum, Hotel Al-Noor!');
    expect(message).toContain('Ref: TM-7K4P9Q');
    expect(message).toContain('1) Chicken Karahi (Full) x 1 — Rs 1,100 = Rs 1,100');
    expect(message).toContain('2) Naan x 4 — Rs 30 = Rs 120');
    expect(message).toContain('Items total: Rs 1,220');
    expect(message).toContain('Delivery charge: Rs 100');
    expect(message).toContain('Name: Ahmad Khan');
    expect(message).toContain('Phone: 03001234567');
    expect(message).toContain('Area: Timergara');
    expect(message).toContain('Landmark: Near Girls Degree College gate');
    expect(message).toContain('Directions: Blue gate, 2nd house on left');
    expect(message).toContain('Location pin: https://maps.google.com/?q=34.8265,71.8412');
    expect(message).toContain('Please confirm the order, delivery charge, time and payment. Thank you.');
  });

  it('handles unconfirmed delivery charge and omitted customer name/phone/pin', () => {
    const message = service.buildMessage({
      restaurantName: 'Shinwari Tikka',
      restaurantWhatsapp: '03451234567',
      reference: 'TM-ABC892',
      items: [
        {
          name: 'Mutton Tikka',
          unitPrice: 200000n,
          quantity: 1,
          lineTotal: 200000n,
        },
      ],
      subtotal: 200000n,
      deliveryFee: null, // to be confirmed
      areaName: 'Balambat',
      landmark: 'Near Post Office',
    });

    expect(message).toContain('Delivery charge: please confirm');
    expect(message).not.toContain('Name:');
    expect(message).not.toContain('Phone:');
    expect(message).not.toContain('Directions:');
    expect(message).not.toContain('Location pin:');
  });

  it('handles Free delivery fee', () => {
    const message = service.buildMessage({
      restaurantName: 'Shinwari Tikka',
      restaurantWhatsapp: '03451234567',
      reference: 'TM-ABC892',
      items: [
        {
          name: 'Tikka',
          unitPrice: 50000n,
          quantity: 1,
          lineTotal: 50000n,
        },
      ],
      subtotal: 50000n,
      deliveryFee: 0n,
      areaName: 'Balambat',
      landmark: 'Near Bridge',
    });

    expect(message).toContain('Delivery charge: Free');
  });

  it('builds a valid wa.me URL with normalized phone and encoded message text', () => {
    const url = service.buildWhatsAppUrl('03001234567', 'Assalam o Alaikum! Test message.');
    expect(url).toBe('https://wa.me/923001234567?text=Assalam%20o%20Alaikum!%20Test%20message.');
  });
});

