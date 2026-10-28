import { Injectable } from '@nestjs/common';
import { normalizePhone } from '../../common/utils/phone.js';

export interface WhatsAppMessageLine {
  name: string;
  variant?: string | null;
  unitPrice: bigint;
  quantity: number;
  lineTotal: bigint;
}

export interface WhatsAppMessageParams {
  restaurantName: string;
  restaurantWhatsapp: string;
  reference: string;
  items: WhatsAppMessageLine[];
  subtotal: bigint;
  deliveryFee?: bigint | null;
  customerName?: string | null;
  customerPhone?: string | null;
  areaName: string;
  landmark: string;
  directions?: string | null;
  mapLat?: number | null;
  mapLng?: number | null;
}

export function formatPaisaToRupees(paisa: bigint): string {
  const rupees = Number(paisa) / 100;
  return `Rs ${rupees.toLocaleString('en-PK')}`;
}

@Injectable()
export class WhatsappMessageService {
  /**
   * Builds the formatted plain text message for WhatsApp handoff according to Dir Food specifications.
   */
  buildMessage(params: WhatsAppMessageParams): string {
    const lines: string[] = [];

    lines.push(`Assalam o Alaikum, ${params.restaurantName.trim()}!`);
    lines.push(`I want to place an order (Ref: ${params.reference})`);
    lines.push('');

    params.items.forEach((item, index) => {
      const variantText = item.variant ? ` (${item.variant})` : '';
      const unitPriceFormatted = formatPaisaToRupees(item.unitPrice);
      const lineTotalFormatted = formatPaisaToRupees(item.lineTotal);
      lines.push(
        `${index + 1}) ${item.name}${variantText} x ${item.quantity} — ${unitPriceFormatted} = ${lineTotalFormatted}`,
      );
    });

    lines.push('');
    lines.push(`Items total: ${formatPaisaToRupees(params.subtotal)}`);

    let deliveryChargeText = 'please confirm';
    if (params.deliveryFee === 0n) {
      deliveryChargeText = 'Free';
    } else if (params.deliveryFee !== null && params.deliveryFee !== undefined && params.deliveryFee > 0n) {
      deliveryChargeText = formatPaisaToRupees(params.deliveryFee);
    }
    lines.push(`Delivery charge: ${deliveryChargeText}`);
    lines.push('');

    if (params.customerName?.trim()) {
      lines.push(`Name: ${params.customerName.trim()}`);
    }
    if (params.customerPhone?.trim()) {
      lines.push(`Phone: ${params.customerPhone.trim()}`);
    }

    lines.push(`Area: ${params.areaName.trim()}`);
    lines.push(`Landmark: ${params.landmark.trim()}`);

    if (params.directions?.trim()) {
      lines.push(`Directions: ${params.directions.trim()}`);
    }

    if (
      params.mapLat !== null &&
      params.mapLat !== undefined &&
      params.mapLng !== null &&
      params.mapLng !== undefined
    ) {
      lines.push(
        `Location pin: https://maps.google.com/?q=${params.mapLat},${params.mapLng}`,
      );
    }

    lines.push('');
    lines.push('Please confirm the order, delivery charge, time and payment. Thank you.');

    return lines.join('\n');
  }

  /**
   * Constructs the WhatsApp URL with prefilled URL-encoded message text.
   */
  buildWhatsAppUrl(whatsappNumber: string, message: string): string {
    const normalizedPhone = normalizePhone(whatsappNumber);
    const encodedText = encodeURIComponent(message);
    return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
  }
}

