export const NOTIFICATION_TARGETS = ["start", "calculator", "market-comparison", "details", "ai-advice", "catalog", "store-settings", "payment-settings", "account", "signup", "signin"];
export const NOTIFICATION_DEFINITIONS = {
  demo: { title: "إشعار تجريبي", message: "هذا إشعار لتجربة الجرس والعدّاد فقط، وليس نتيجة عملية حفظ أو تغيير في أرباحك.", level: "info", target: "start" },
  account_created: { title: "حسابك جاهز", message: "تم إنشاء حسابك وحفظ بياناتك بنجاح.", level: "success", target: "account" },
  profile_updated: { title: "تم تحديث حسابك", message: "تم حفظ التعديلات على بيانات حسابك.", level: "success", target: "account" },
  product_created: { title: "تمت إضافة المنتج", message: "تم حفظ «{name}» ضمن منتجاتك.", level: "success", target: "catalog" },
  product_updated: { title: "تم تعديل المنتج", message: "تم حفظ تعديلات «{name}».", level: "success", target: "catalog" },
  calculation_saved: { title: "الحسبة محفوظة", message: "تم حفظ بيانات حاسبة التسعير في حسابك.", level: "success", target: "calculator" },
  settings_saved: { title: "تم حفظ الإعدادات", message: "تم تحديث تكاليف المتجر والرسوم الافتراضية.", level: "success", target: "store-settings" },
  loss_warning: { title: "تنبيه خسارة", message: "سعر بيع «{name}» أقل من التكلفة الإجمالية. راجع تسعير المنتج.", level: "danger", target: "catalog" },
  margin_warning: { title: "الهامش أقل من المستهدف", message: "هامش ربح «{name}» أقل من الهامش الذي حددته. راجع السعر والتكاليف.", level: "warning", target: "catalog" },
  calculator_loss: { title: "سعر المقارنة يسبب خسارة", message: "سعر البيع المقارن أقل من التكلفة. راجع المقارنة قبل اعتماد السعر.", level: "danger", target: "market-comparison" },
  calculator_margin: { title: "راجع هامش سعر المقارنة", message: "هامش سعر البيع المقارن أقل من النسبة المستهدفة التي اخترتها.", level: "warning", target: "market-comparison" },
  validation_error: { title: "راجع البيانات المدخلة", message: "هناك حقول ناقصة أو قيم غير صحيحة. راجع الحقول الموضحة في النموذج.", level: "warning", target: "details" },
  save_failed: { title: "تعذر حفظ البيانات", message: "لم تكتمل عملية الحفظ. تحقق من الاتصال وأعد المحاولة.", level: "danger", target: "calculator" },
  login_failed: { title: "تعذر تسجيل الدخول", message: "لم تكتمل محاولة الدخول. راجع بيانات الدخول والرسالة الموضحة.", level: "warning", target: "signin" },
  connection_error: { title: "مشكلة في الاتصال", message: "تعذر الاتصال بالخادم. قد تحتاج بياناتك إلى إعادة المحاولة.", level: "danger", target: "start" },
  ai_ready: { title: "اقتراح ذكي جديد", message: "تم إنشاء اقتراح بناءً على بيانات التسعير. افتح قسم الاقتراحات للمراجعة أو طلب اقتراح أحدث.", level: "info", target: "ai-advice" },
};
