import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseDuration(durationStr: string | null): number {
  if (!durationStr) return 60;
  
  const str = durationStr.toLowerCase();
  
  // Format "2:30" or "01:30"
  const colonMatch = str.match(/(\d+):(\d+)/);
  if (colonMatch) {
    return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  }

  let totalMinutes = 0;

  // Handle "1h 30min" or "1 hora e 30 minutos"
  const hourMatch = str.match(/(\d+)\s*(h|hora|hr)/);
  const minuteMatch = str.match(/(\d+)\s*(m|min|minuto)/);

  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1]) * 60;
  }
  
  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1]);
  } else if (!hourMatch) {
    // If no hour or minute labels found, just take the first number as minutes
    const onlyDigits = str.match(/(\d+)/);
    if (onlyDigits) {
      totalMinutes = parseInt(onlyDigits[1]);
    }
  }

  return totalMinutes || 60;
}

export function formatDuration(durationStr: string | null): string {
  const totalMinutes = parseDuration(durationStr);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let result = "Duração: ";
  if (hours > 0) {
    result += `${hours}h`;
    if (minutes > 0) {
      result += ` e ${minutes}min`;
    }
  } else {
    result += `${minutes}min`;
  }
  
  return result;
}

export function getAppointmentErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("idx_clients_owner_name_unique") || normalizedMessage.includes("duplicate key")) {
    return "Já existe uma cliente cadastrada com esse nome. Tente novamente.";
  }

  if (normalizedMessage.includes("not authenticated") || normalizedMessage.includes("não autenticado")) {
    return "Você precisa entrar na sua conta para criar um agendamento.";
  }

  if (normalizedMessage.includes("row-level security") || normalizedMessage.includes("permission denied")) {
    return "Você não tem permissão para realizar este agendamento.";
  }

  return "Não foi possível concluir o agendamento. Tente novamente em instantes.";
}

export function formatPhone(value: string) {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, "");
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 3) return phoneNumber;
  if (phoneNumberLength < 7) {
    return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
  }
  return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(
    7,
    11
  )}`;
}
