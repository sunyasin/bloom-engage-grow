import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "ru" | "en";

interface Translations {
  [key: string]: {
    ru: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation
  "nav.communities": { ru: "Сообщества", en: "Communities" },
  "nav.myCommunities": { ru: "Мои сообщества", en: "My Communities" },
  "nav.events": { ru: "События", en: "Events" },
  "nav.map": { ru: "Карта", en: "Map" },
  "nav.profile": { ru: "Кабинет", en: "Profile" },
  "nav.help": { ru: "Помощь", en: "Help" },
  "nav.signIn": { ru: "Вход", en: "Sign In" },
  "nav.signOut": { ru: "Выйти", en: "Sign Out" },
  "nav.register": { ru: "Регистрация", en: "Register" },
  "nav.admin": { ru: "Админ", en: "Admin" },
  "nav.myCourses": { ru: "Мои курсы", en: "My Courses" },

  // Home page
  "home.popularCommunities": { ru: "Популярные сообщества", en: "Popular Communities" },
  "home.members": { ru: "участников", en: "members" },
  "home.noCommunities": { ru: "Пока нет сообществ", en: "No communities yet" },
  "home.createFirst": { ru: "Создайте первое сообщество", en: "Create the first community" },

  // Community
  "community.join": { ru: "Вступить", en: "Join" },
  "community.leave": { ru: "Покинуть", en: "Leave" },
  "community.feed": { ru: "Лента", en: "Feed" },
  "community.courses": { ru: "Курсы", en: "Courses" },
  "community.members": { ru: "Участники", en: "Members" },
  "community.about": { ru: "О сообществе", en: "About" },
  "community.writeSomething": { ru: "Напишите что-нибудь...", en: "Write something..." },
  "community.post": { ru: "Опубликовать", en: "Post" },
  "community.reply": { ru: "Ответить", en: "Reply" },
  "community.replies": { ru: "ответов", en: "replies" },
  "community.pin": { ru: "Закрепить", en: "Pin" },
  "community.unpin": { ru: "Открепить", en: "Unpin" },
  "community.pinned": { ru: "Закреплено", en: "Pinned" },
  "community.create": { ru: "Создать сообщество", en: "Create Community" },
  "community.created": { ru: "Сообщество создано", en: "Community Created" },
  "community.createdDesc": {
    ru: "Ваше сообщество успешно создано",
    en: "Your community has been created successfully",
  },
  "community.name": { ru: "Название", en: "Name" },
  "community.namePlaceholder": { ru: "Введите название сообщества", en: "Enter community name" },
  "community.description": { ru: "Описание", en: "Description" },
  "community.descriptionPlaceholder": { ru: "Расскажите о сообществе...", en: "Tell us about the community..." },
  "community.visibility": { ru: "Видимость", en: "Visibility" },
  "community.public": { ru: "Публичное", en: "Public" },
  "community.byRequest": { ru: "По заявке", en: "By Request" },
  "community.private": { ru: "Приватное", en: "Private" },
  "community.createFirst": { ru: "Создайте первое сообщество", en: "Create your first community" },
  "common.error": { ru: "Ошибка", en: "Error" },

  // Password Reset
  "auth.forgotPassword": { ru: "Забыли пароль?", en: "Forgot password?" },
  "auth.resetPassword": { ru: "Сбросить пароль", en: "Reset Password" },
  "auth.enterEmailFirst": { ru: "Сначала введите email", en: "Enter your email first" },
  "auth.resetEmailSent": { ru: "Письмо для сброса пароля отправлено", en: "Password reset email sent" },
  "auth.checkEmailForReset": {
    ru: "Проверьте почту для инструкций по сбросу пароля",
    en: "Check your email for password reset instructions",
  },
  "auth.backToLogin": { ru: "Вернуться к входу", en: "Back to login" },
  "auth.newPassword": { ru: "Новый пароль", en: "New Password" },
  "auth.confirmPassword": { ru: "Подтвердите пароль", en: "Confirm Password" },
  "auth.enterNewPassword": { ru: "Введите новый пароль", en: "Enter your new password" },
  "auth.passwordsDoNotMatch": { ru: "Пароли не совпадают", en: "Passwords do not match" },
  "auth.passwordTooShort": {
    ru: "Пароль должен быть не менее 6 символов",
    en: "Password must be at least 6 characters",
  },
  "auth.passwordResetSuccess": { ru: "Пароль успешно изменён", en: "Password successfully changed" },
  "auth.invalidResetLink": { ru: "Недействительная ссылка сброса пароля", en: "Invalid password reset link" },
  "auth.signedInSuccessfully": { ru: "Вход выполнен успешно", en: "Signed in successfully" },
  "auth.accountCreatedSuccessfully": { ru: "Аккаунт создан успешно", en: "Account created successfully" },
  "auth.processing": { ru: "Обработка...", en: "Processing..." },
  "auth.signIn": { ru: "Войти", en: "Sign In" },
  "auth.createAccount": { ru: "Создать аккаунт", en: "Create Account" },
  "auth.enterCredentials": { ru: "Введите данные для входа", en: "Enter your credentials to access your account" },
  "auth.createNewAccount": { ru: "Создайте новый аккаунт", en: "Create a new account to get started" },
  "auth.success": { ru: "Успешно", en: "Success" },
  "auth.password": { ru: "Пароль", en: "Password" },

  // Common
  "common.loading": { ru: "Загрузка...", en: "Loading..." },
  "common.save": { ru: "Сохранить", en: "Save" },
  "common.cancel": { ru: "Отмена", en: "Cancel" },
  "common.edit": { ru: "Редактировать", en: "Edit" },
  "common.delete": { ru: "Удалить", en: "Delete" },
  "common.create": { ru: "Создать", en: "Create" },
  "common.search": { ru: "Поиск", en: "Search" },
  "common.loginRequired": { ru: "Необходимо войти в систему", en: "You must be logged in" },
  "common.cannotLikeOwnPost": { ru: "Нельзя лайкать свои сообщения", en: "You cannot like your own posts" },
  "common.like": { ru: "Нравится", en: "Like" },
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "ru";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation: ${key}`);
      return key;
    }
    return translation[language];
  };

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
};

export const useLanguage = useI18n;
