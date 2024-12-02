import {
  Bot,
  Context,
  InlineKeyboard,
} from "https://deno.land/x/grammy@v1.32.0/mod.ts";

// интерфейс и тип для корректной работы и ide
interface UserInfo {
  id: number;
  name: string;
  age: number;
  interests: string[];
  geo: Record<string, number>;
  time: string;
  state: string;
}
type MyContext = Context & {
  config: UserInfo;
};

const database = await Deno.openKv();

//объявил бота
export const bot = new Bot<MyContext>(Deno.env.get("BOT_TOKEN") || "");

// эта переменная нужна для обработки состояния - устанавливает ли пользователь имя или, например, ожидает встречи
// Список states на данный момент:
// setName - установка имени
// setAge - установка возраста
// setInterests - установка интересов
// setGeo - установка геопозиции
// setTime - установка времени
// pending - состояние ожидания
// review - проверка анкеты пользователем
// searching - состояние поиска

// info будет нужна для сохранения инфо пользователя в бд (или получения) - представляет из себя набор данных о пользователе
const info: UserInfo = {
  id: 0,
  name: "",
  age: 0,
  interests: [],
  geo: {
    latitude: 0,
    longtitude: 0
  },
  time: "",
  state: "",
};

// будущий middleware !пригодится для бд!
bot.use(
  // async (ctx, next) => {
  //   // ctx.config = {
  //   // };
  //   await next();
  // },
);

bot.on("message", (ctx) => {
  if (info.id == 0) {
    info.id = ctx.msg.from.id;
  }
});

bot.command("start", async (ctx) => { // бот получает команду /start
  if (await database.get(["users", info.id])) {
    await ctx.reply("in db")
    info.state = String(
      (await database.get(["users", info.id, "state"])).value,
    );
  } else {
    await ctx.reply(
      "Привет!👋🏻 \nВижу, ты тут впервые. Я - бот Коффи☕️. С моей помощью ты сможешь пообщаться с людьми, которым интересно то же, что и тебе!",
    );
    await ctx.reply(
      "🤔 А как зовут тебя? \n <b>Учти, что твое имя увидят другие пользователи.</b>",
      { parse_mode: "HTML" }, // нужно, чтобы использовать теги из html
    );
    info.state = "setName"; // следующим сообщением боту должно придти имя
  }
});

// клавиатура для подтверждения интересов
const yesOrNo = new InlineKeyboard().text("Да✅", "interestsDone").text(
  "Нет❌",
  "interestsNotDone",
);

//обработка подтверждения интересов
bot.callbackQuery("interestsDone", async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply("Отлично!");
  await ctx.reply("Вот, как тебя увидят другие пользователи:");
  await ctx.reply(`${info.name}, ${info.age}\n` + `Список интересов: ${info.interests.toString()}`);
  await ctx.reply("Геопозиция района, где будет удообно встретиться:");
  await ctx.replyWithLocation(info.geo.latitude, info.geo.longitiute)
  await ctx.reply("Все верно?")
  info.state = "review";
});
bot.callbackQuery("interestsNotDone", async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply("Хорошо, напиши еще увлечений!");
  info.state = "setInterests";
});

bot.hears('да', async ctx => { // пока без обработки
  await database.set(["users", info.id], info)
})

bot.on("message", async (ctx) => {
  if (info.state) { // при непустом info.state
    switch (info.state) {
      case "setName":
        if (
          typeof ctx.msg.text !== "string" ||
          /[0-9_.*^%$#@!]/.test(ctx.msg.text) // регулярное выражение на проверку спец символов
        ) {
          await ctx.reply(
            "Извини, но имя должно быть текстом, не содержащим цифр или спецсимволов!",
          );
          return;
        } else {
          info.name = ctx.msg.text || ""; //сохраняем в переменную
          await ctx.reply("Приятно познакомиться, " + info.name + "!");
          await ctx.reply("Кстати, сколько тебе лет?");
          info.state = "setAge"; // и меняем состояние
        }

        break;

      case "setAge":
        if (isNaN(Number(ctx.msg.text))) {
          await ctx.reply("Извини, но нужно ввести возраст числом!");
          return;
        }

        info.age = Number(ctx.msg.text);
        await ctx.reply(
          "Отлично! 🤩 Отправь мне местоположение, рядом с которым тебе будет удобно встретиться",
        );
        await ctx.reply(
          "👀 Подсказка: нажми на скрепку🖇️ -> местоположение📍",
        );
        info.state = "setGeo";
        break;
      case "setGeo":
        if (!ctx.msg.location) {
          await ctx.reply(
            "🤔 Я не понял. Пожалуйста, отправь мне местоположение",
          );
          return;
        }

        info.geo.latitude = ctx.msg.location?.latitude
        info.geo.longitiute = ctx.msg.location?.longitude // записываем геопозицию в виде: ширина, долгота
        await ctx.reply(
          "😎 А теперь расскажи мне немного о себе. Перечисли через запятую свои хобби и увлечения!",
        );
        info.state = "setInterests";
        break;

      case "setInterests":
        if (ctx.msg.text) {
          for (const interest of ctx.msg.text?.split(",")) {
            info.interests.push(interest.trim());
          }
        }
        await ctx.reply(
          "🏆 Вот список твоих интересов:",
        );
        await ctx.reply(
          info.interests.toString(),
        );
        await ctx.reply("Это все?", { reply_markup: yesOrNo }); // смотри bot.callbackQuery
        break;
      default:
        break;
    }
  }
});
