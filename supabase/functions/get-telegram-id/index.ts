import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const message = body.message
    
    if (!message) {
      return new Response(JSON.stringify({ error: 'No message' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const userId = message.from.id        // Telegram ID
    const username = message.from.username || null
    const firstName = message.from.first_name
    const chatId = message.chat.id

    const text = message.text?.toLowerCase()

    // Команда /start — регистрируем пользователя
    if (text === '/start') {
      // Проверяем, есть ли уже пользователь
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', userId)
        .single()

      if (!existingUser) {
        // Создаём нового пользователя
        const { data, error } = await supabase
          .from('users')
          .insert({
            telegram_id: userId,
            username,
            first_name: firstName,
            registered_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
      }

      // Отправляем ответ боту
      await sendTelegramMessage(
        Deno.env.get('BOT_TOKEN')!,
        chatId,
        `🎉 Зарегистрирован!\n\n🆔 ID: <code>${userId}</code>\n👤 ${firstName}${username ? ` (@${username})` : ''}`
      )

      return new Response(JSON.stringify({ success: true, userId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Команда /id — просто показываем ID
    if (text === '/id') {
      await sendTelegramMessage(
        Deno.env.get('BOT_TOKEN')!,
        chatId,
        `🆔 Твой Telegram ID: <code>${userId}</code>`
      )
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error(error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Функция отправки сообщений через Telegram API
async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    })
  })
}
