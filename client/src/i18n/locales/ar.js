import en from "./en.js";

const ar = Object.fromEntries(Object.keys(en).map((sourceArabic) => [sourceArabic, sourceArabic]));

export default ar;
