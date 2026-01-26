import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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

    const telegramUserId = message.from.id        // Telegram ID отправителя
    const username = message.from.username || null
    const firstName = message.from.first_name
    const chatId = message.chat.id
    const text = message.text?.trim()

    // Команда /start или UUID профиля — привязываем Telegram ID
    if (text === '/start' || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) {
      const profileUuid = text === '/start' ? null : text

      let profileRecord = null

      // Если пользователь прислал UUID профиля — ищем его
      if (profileUuid) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, real_name')
          .eq('id', profileUuid)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
          throw new Error(`Профиль с ID ${profileUuid} не найден`)
        }

        if (!data) {
          await sendTelegramMessage(
            Deno.env.get('BOT_TOKEN')!,
            chatId,
            `❌ Профиль с ID <code>${profileUuid}</code> не найден\n\n👉 Проверь UUID в личном кабинете`
          )
          return new Response(JSON.stringify({ error: 'Profile not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        profileRecord = data
      } else {
        // /start без UUID — показываем инструкцию
        await sendTelegramMessage(
          Deno.env.get('BOT_TOKEN')!,
          chatId,
          `👋 Пришли свой Profile UUID из таблицы profiles\n\n📝 Пример:\n<code>23805f2c-1230-4556-9175-2d34c84212bc</code>\n\n❓ Как узнать:\n1. Личный кабинет > Мой профиль\n2. Скопируй UUID (32 символа с дефисами)\n3. Отправь сюда`
        )
        return new Response(JSON.stringify({ needsProfileUuid: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Проверяем, привязан ли уже Telegram ID
      const { data: existingTelegram } = await supabase
        .from('profiles')
        .select('telegram_user_id')
        .eq('id', profileUuid)
        .single()

      if (existingTelegram?.telegram_user_id) {
        await sendTelegramMessage(
          Deno.env.get('BOT_TOKEN')!,
          chatId,
          `⚠️ Telegram уже привязан к этому профилю\n🆔 Старый ID: <code>${existingTelegram.telegram_user_id}</code>`
        )
        return new Response(JSON.stringify({ alreadyLinked: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // ОБНОВЛЯЕМ Telegram ID в таблице profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          telegram_user_id: telegramUserId,
          telegram_username: username,
          telegram_first_name: firstName,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileUuid)

      if (updateError) throw updateError

      // Отправляем подтверждение
      await sendTelegramMessage(
        Deno.env.get('BOT_TOKEN')!,
        chatId,
        `✅ Telegram ID успешно привязан!\n\n🔗 Профиль: <code>${profileUuid}</code>\n🆔 Telegram ID: <code>${telegramUserId}</code>\n👤 ${firstName}${username ? ` (@${username})` : ''}`
      )

      return new Response(JSON.stringify({ 
        success: true, 
        profileUuid, 
        telegramUserId 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Команда /help
    if (text === '/help') {
      await sendTelegramMessage(
        Deno.env.get('BOT_TOKEN')!,
        chatId,
        `🤖 Бот привязки Telegram ID\n\n📝 Отправь свой Profile UUID:\n<code>23805f2c-1230-4556-9175-2d34c84212bc</code>\n\n📍 Где взять:\n1. Личный кабинет > Мой профиль\n2. Скопируй UUID из URL или поля ID`
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
