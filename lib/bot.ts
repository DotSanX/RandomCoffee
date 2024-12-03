import { Bot } from "https://deno.land/x/grammy@v1.32.0/mod.ts";

import { changesKeyboard, menuKeyboard, yesOrNo } from "./keyboards.ts"; // импорт клавиатур

import { MyContext, UserInfo } from "./interfaces.ts"; //импорт интерфейсов

import { reviewProfile, setState } from "./functions.ts"; //импорт функций

//база данных deno
export const database = await Deno.openKv();

//объявил бота
export const bot = new Bot<MyContext>(Deno.env.get("BOT_TOKEN") || "");

// info будет нужна для сохранения инфо пользователя в бд (или получения) - представляет из себя набор данных о пользователе
export const info: UserInfo = {
  id: 0,
  name: "",
  age: 0,
  interests: [],
  geo: {
    latitude: 0,
    longtitude: 0,
  },
  time: "",
  state: "",
  rating: 0,
};

bot.command("start", async (ctx) => { // бот получает команду /start
  info.id = Number(ctx.msg.from?.id);
  if ((await database.get(["users", info.id])).value != null) {
    // опитимизировать?
    info.name = String((await database.get(["users", info.id, "name"])).value);
    info.age = Number((await database.get(["users", info.id, "age"])).value);
    info.interests = Array(
      String((await database.get(["users", info.id, "interests"])).value),
    );
    info.geo.latitude = Number(
      (await database.get(["users", info.id, "geo", "latitude"])).value,
    );
    info.geo.longitiute = Number(
      (await database.get(["users", info.id, "geo", "longtitude"])).value,
    );
    info.time = String((await database.get(["users", info.id, "state"])).value);
    info.state = String(
      (await database.get(["users", info.id, "state"])).value,
    );
    info.rating = Number(
      (await database.get(["users", info.id, "rating"])).value,
    );
    await ctx.reply(`Привет, ${info.name}!`, { reply_markup: menuKeyboard });
  } else {
    await ctx.reply(
      "Привет!👋🏻 \nВижу, ты тут впервые. Я - бот Коффи☕️. С моей помощью ты сможешь пообщаться с людьми, которым интересно то же, что и тебе!",
    );
    await ctx.reply(
      "🤔 А как зовут тебя? \n <b>Учти, что твое имя увидят другие пользователи.</b>",
      { parse_mode: "HTML" }, // нужно, чтобы использовать теги из html
    );
    setState("setName"); // следующим сообщением боту должно придти имя
  }
});

//обработка подтверждения интересов
bot.callbackQuery("interestsDone", async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply("Отлично!");
  await reviewProfile(ctx);
});
bot.callbackQuery("interestsNotDone", async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply("Хорошо, напиши еще увлечений!");
  setState("setInterests"); // следующим сообщением боту должно придти имя
});

bot.hears(
  ["профиль", "Профиль", "Мой профиль", "Мой профиль 👤"],
  async (ctx) => {
    await reviewProfile(ctx);
  },
);

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
          setState("setAge");
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
        setState("setGeo");
        break;

      case "review":
        switch (ctx.msg.text) {
          case "Да!":
            await ctx.reply("Отлично!");
            await database.set(["users", info.id, "name"], info.name);
            await database.set(["users", info.id, "age"], info.age);
            await database.set(["users", info.id, "interests"], info.interests);
            await database.set(["users", info.id, "geo"], info.geo);
            await database.set(["users", info.id, "state"], info.state);
            await database.set(["users", info.id, "time"], info.time);
            break;

          case "Нет, хочу изменить":
            setState("changeProfile");
            await ctx.reply("Выбери, что хочешь изменить", {
              reply_markup: changesKeyboard,
            });
            break;

          default:
            await ctx.reply("Выбери один из вариантов на клавиатуре Telegram!");
            break;
        }
        break;
      case "changeProfile":
        switch (ctx.msg.text) {
          case "Имя":
            await ctx.reply("Хорошо, введи другое имя")
            break;
          case "Возраст":
            await ctx.reply("Хорошо, введи другой возраст")
            break;
          case "Геопозицию":
            await ctx.reply("Хорошо, отправь другую геопозицию")
            break;
          case "Интересы":
            await ctx.reply("Хорошо, введи другие интересы")
            break;
          case "Удобное время":
            await ctx.reply("Хорошо, введи другое время")
            break;
          case "Хочу заполнить профиль заново":
            await ctx.reply("Хорошо, введи другое имя")
            break;
          default:
            await ctx.reply("Выбери вариант ответа, используя клавиатуру Telegram!")
            break;
        }
        break;
      case "setGeo":
        if (!ctx.msg.location) {
          await ctx.reply(
            "🤔 Я не понял. Пожалуйста, отправь мне местоположение",
          );
          return;
        }
        info.geo.latitude = ctx.msg.location?.latitude;
        info.geo.longitiute = ctx.msg.location?.longitude; // записываем геопозицию в виде: ширина, долгота
        await ctx.reply(
          "😎 А теперь расскажи мне немного о себе. Перечисли через запятую свои хобби и увлечения!",
        );
        setState("setInterests");
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
