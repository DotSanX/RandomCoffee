
export const commands = {
  "start": (ctx: any) => {
    if (ctx.msg.from.id)
    ctx.reply(
      "Привет!👋🏻 \nВижу, ты тут впервые. Я - бот Коффи☕️. С моей помощью ты сможешь пообщаться с людьми, которым интересно то же, что и тебе!",
    );
    ctx.reply(
      "🤔 А как зовут тебя? \n <b>Учти, что твое имя увидят другие пользователи.</b>", {parse_mode: "HTML"},
    );
    ctx.reply(ctx.msg.from.id)
  },
};
