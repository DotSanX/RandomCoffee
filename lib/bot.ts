import { Bot, Context } from "https://deno.land/x/grammy@v1.32.0/mod.ts";
interface UserInfo {
  state: string;
  info: Record<string, string | number | []>;
}
type MyContext = Context & {
  config: UserInfo;
};
export const bot = new Bot<MyContext>(Deno.env.get("BOT_TOKEN") || "");

bot.use(
  async (ctx, next) => {
    ctx.config = {
      state: "",
      info: {},
    };
    await next();
  },
);

bot.command("start", async (ctx) => {
  await ctx.reply(
    "Привет!👋🏻 \nВижу, ты тут впервые. Я - бот Коффи☕️. С моей помощью ты сможешь пообщаться с людьми, которым интересно то же, что и тебе!",
  );
  await ctx.reply(
    "🤔 А как зовут тебя? \n <b>Учти, что твое имя увидят другие пользователи.</b>",
    { parse_mode: "HTML" },
  );
  ctx.config.state = "setName";
});

bot.on("message", async (ctx) => {
  console.log(ctx.config.state);
  if (ctx.config.state) {
    const state = ctx.config.state;
    switch (state) {
      case "setName":
        ctx.config.state = ctx.msg.text || "";
        ctx.reply("Отличное имя, " + ctx.config.info.name + "!");
        ctx.reply("Кстати, сколько тебе лет?");
        ctx.config.state = "setAge";
        break;
      case "setAge":
        ctx.config.info.age = Number(ctx.msg.text);
        ctx.reply(
          "Отлично! 🤩 Отправь мне местоположение, рядом с которым тебе будет удобно встретиться",
        );
        ctx.config.state = "setInterests";
        break;

      default:
        break;
    }
  }
});
