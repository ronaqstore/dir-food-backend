import { Injectable } from '@nestjs/common';
import { AppConfigurationService } from '../../app-configuration/app-configuration.service.js';
import { normalizePhone } from '../../common/utils/phone.js';

export interface WhatsAppMessageLine {
  name: string;
  variant?: string | null;
  addons?: Array<{ name: string; price: number | bigint }> | null;
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
  buildMessage(params: WhatsAppMessageParams): string {
    const lines: string[] = [];

    lines.push(`Assalam o Alaikum, ${params.restaurantName.trim()}!`);
    lines.push('I would like to place an order from your Dir Food menu:');
    lines.push('');
    lines.push(`Ref: ${params.reference.trim()}`);
    lines.push('');

    params.items.forEach((item, index) => {
      const variantText = item.variant?.trim()
        ? ` (${item.variant.trim()})`
        : '';
      const unitPriceText = formatPaisaToRupees(item.unitPrice);
      const lineTotalText = formatPaisaToRupees(item.lineTotal);
      lines.push(
        `${index + 1}) ${item.name.trim()}${variantText} x ${item.quantity} — ${unitPriceText} = ${lineTotalText}`,
      );
      if (item.addons && item.addons.length > 0) {
        item.addons.forEach((a) => {
          lines.push(
            `   + ${a.name.trim()} (${formatPaisaToRupees(BigInt(a.price))})`,
          );
        });
      }
    });

    lines.push('');
    lines.push(`Items total: ${formatPaisaToRupees(params.subtotal)}`);

    let deliveryChargeText = 'please confirm';
    if (params.deliveryFee === 0n) {
      deliveryChargeText = 'Free';
    } else if (
      params.deliveryFee !== null &&
      params.deliveryFee !== undefined &&
      params.deliveryFee > 0n
    ) {
      deliveryChargeText = formatPaisaToRupees(params.deliveryFee);
    }
    lines.push(`Delivery charge: ${deliveryChargeText}`);
    lines.push('');
    lines.push('Delivery Details:');

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
        `Location pin: ${AppConfigurationService.GOOGLE_MAPS_BASE_URL}${params.mapLat},${params.mapLng}`,
      );
    }

    lines.push('');
    lines.push(
      'Please confirm the order, delivery charge, time and payment. Thank you.',
    );

    return lines.join('\n');
  }

  buildWhatsAppUrl(whatsappNumber: string, message: string): string {
    const normalizedPhone = normalizePhone(whatsappNumber);
    const encodedText = encodeURIComponent(message);
    return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
  }
}
