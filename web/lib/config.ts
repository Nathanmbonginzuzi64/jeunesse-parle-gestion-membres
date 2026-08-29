/** Mode design : le frontend n'appelle pas Laravel tant que ce drapeau reste actif. */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";
