# Billing Mercado Pago

O billing usa assinaturas recorrentes do Mercado Pago.

## Secrets do ambiente Lovable Cloud

Configurar como secrets do servidor:
- MERCADOPAGO_ACCESS_TOKEN
- MERCADOPAGO_WEBHOOK_SECRET
- PUBLIC_APP_URL

Não colocar essas credenciais no GitHub.

## Endpoints

Checkout autenticado:
POST /api/billing/checkout
Authorization: Bearer <Supabase access token>
Body: {"planCode":"standard"}

Webhook:
POST /api/webhooks/mercadopago

Eventos usados:
- subscription_preapproval
- subscription_authorized_payment

O webhook valida x-signature por HMAC-SHA256, rejeita assinaturas com mais de 5 minutos e é idempotente por provider_event_id.

## Configuração dos planos

No Super-Admin > Cobrança, configure o valor mensal e ative os planos Standard e Custom Domain.

## Fluxo

Plano -> checkout Mercado Pago -> subscription_preapproval -> licença active -> cobranças recorrentes -> authorized payment -> renovação da licença.

Assinaturas pausadas/canceladas alteram o estado da licença.

## Produção

Antes de ativar planos para venda, testar com credenciais de teste e uma conta de teste do Mercado Pago. Só depois configurar as credenciais de produção e a URL de webhook de produção.
