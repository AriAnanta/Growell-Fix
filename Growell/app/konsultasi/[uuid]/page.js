'use client';
import { useParams } from 'next/navigation';
import WhatsAppChatClient from '@/components/chat/WhatsAppChatClient';

export default function KonsultasiDirectLinkPage() {
  const params = useParams();
  
  return <WhatsAppChatClient initialUuid={params.uuid} />;
}
