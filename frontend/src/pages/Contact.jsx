import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Mail, Phone, MapPin, Send, MessageCircle } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { toggleChat } from "../store/slices/chatSlice";
import { toggleAuthPopup } from "../store/slices/popupSlice";

const Contact = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { authUser } = useSelector((state) => state.auth);
  // Chat needs an account: signed-out visitors get the sign-in screen first.
  const openChat = () => dispatch(authUser ? toggleChat() : toggleAuthPopup());
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });

  useEffect(() => {
    axiosInstance
      .get("/settings")
      .then(({ data }) => setSettings(data.settings))
      .catch(() => {});
  }, []);

  const contactEmail = settings?.contact_email;

  // There is no message API: hand the message to the visitor's mail app, addressed to the shop.
  const handleSubmit = (e) => {
    e.preventDefault();
    const body = `${formData.message}\n\n— ${formData.name} (${formData.email})`;
    window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(body)}`;
  };

  const update = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  const details = [
    contactEmail && { icon: Mail, label: t("contact.email"), value: contactEmail, href: `mailto:${contactEmail}` },
    settings?.contact_phone && { icon: Phone, label: t("contact.phone"), value: settings.contact_phone, href: `tel:${settings.contact_phone}` },
    settings?.address && { icon: MapPin, label: t("contact.address"), value: settings.address },
  ].filter(Boolean);

  return (
    <div className="page max-w-5xl">
      <div className="max-w-2xl">
        <h1 className="page-title">{t("contact.title")}</h1>
        <p className="page-subtitle">{t("contact.subtitle")}</p>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {details.map((item) => (
            <div key={item.label} className="surface p-4 flex items-start gap-3">
              <span className="w-10 h-10 shrink-0 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <item.icon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                {item.href ? (
                  <a href={item.href} className="mt-0.5 block text-sm font-medium text-foreground hover:text-primary break-words">
                    {item.value}
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm font-medium text-foreground">{item.value}</p>
                )}
              </div>
            </div>
          ))}

          {/* Without an email the form panel already offers the chat. */}
          {contactEmail && (
            <div className="surface p-4">
              <p className="text-sm font-semibold text-foreground">{t("contact.chatTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("contact.chatText")}</p>
              <button onClick={openChat} className="btn-outline mt-3">
                <MessageCircle className="w-4 h-4" />
                {t("contact.chatCta")}
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 surface p-5 sm:p-6">
          {contactEmail ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="field-label">{t("contact.namePlaceholder")}</label>
                  <input id="contact-name" type="text" autoComplete="name" value={formData.name} onChange={update("name")} className="field" required />
                </div>
                <div>
                  <label htmlFor="contact-email" className="field-label">{t("contact.emailPlaceholder")}</label>
                  <input id="contact-email" type="email" autoComplete="email" value={formData.email} onChange={update("email")} className="field" required />
                </div>
              </div>
              <div>
                <label htmlFor="contact-subject" className="field-label">{t("contact.subjectPlaceholder")}</label>
                <input id="contact-subject" type="text" value={formData.subject} onChange={update("subject")} className="field" required />
              </div>
              <div>
                <label htmlFor="contact-message" className="field-label">{t("contact.messagePlaceholder")}</label>
                <textarea id="contact-message" rows={6} value={formData.message} onChange={update("message")} className="field h-auto py-3 resize-none" required />
              </div>
              <button type="submit" className="btn-primary btn-lg w-full">
                <Send className="w-4 h-4" />
                {t("contact.sendMessage")}
              </button>
              <p className="text-xs text-center text-muted-foreground">{t("contact.formNote")}</p>
            </form>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <span className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
              </span>
              <p className="mt-4 text-sm text-muted-foreground max-w-xs">{t("contact.chatText")}</p>
              <button onClick={openChat} className="btn-primary mt-5">
                {t("contact.chatCta")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contact;
