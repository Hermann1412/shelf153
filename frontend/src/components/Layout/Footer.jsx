import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Mail, Phone, MapPin, Facebook, Instagram } from "lucide-react";
import { axiosInstance } from "../../lib/axios";
import Logo from "./Logo";

const WhatsApp = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.64-1.03-5.12-2.9-6.99A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.24 8.24 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 0 1-1.21-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.27 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.8-.22-.08-.38-.12-.55.13-.16.25-.63.8-.77.97-.14.16-.28.18-.53.06-.25-.12-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.38-1.72c-.14-.25-.02-.38.11-.51.11-.11.25-.28.37-.42.12-.15.16-.25.24-.42.08-.16.04-.31-.02-.43-.06-.12-.55-1.33-.75-1.82-.2-.47-.4-.4-.55-.41h-.47c-.16 0-.42.06-.64.31-.22.25-.84.83-.84 2.03s.86 2.36.98 2.52c.12.16 1.7 2.6 4.14 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.11-.22-.17-.47-.29Z" />
  </svg>
);

const Footer = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    axiosInstance
      .get("/settings")
      .then(({ data }) => setSettings(data.settings))
      .catch(() => {});
  }, []);

  const footerLinks = {
    company: [
      { name: t("footer.sell"), path: "/vendre" },
      { name: t("footer.aboutUs"), path: "/about" },
      { name: t("footer.careers"), path: "#" },
      { name: t("footer.press"), path: "#" },
      { name: t("footer.blog"), path: "#" },
    ],
    customer: [
      { name: t("footer.contactUs"), path: "/contact" },
      { name: t("footer.faq"), path: "/faq" },
      { name: t("footer.shippingInfo"), path: "#" },
      { name: t("footer.returns"), path: "#" },
    ],
    legal: [
      { name: t("footer.privacyPolicy"), path: "#" },
      { name: t("footer.termsOfService"), path: "#" },
      { name: t("footer.cookiePolicy"), path: "#" },
      { name: t("footer.security"), path: "#" },
    ],
  };

  const socialLinks = [
    { icon: WhatsApp, href: "#", label: "WhatsApp" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Facebook, href: "#", label: "Facebook" },
  ];

  const columns = [
    { title: t("footer.company"), links: footerLinks.company },
    { title: t("footer.customerService"), links: footerLinks.customer },
    { title: t("footer.legal"), links: footerLinks.legal },
  ];

  return (
    <footer className="mt-8 bg-card border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-10">
          {/* Brand & Contact */}
          <div className="col-span-2 md:col-span-4 lg:col-span-2 lg:pr-10">
            <Logo textClassName="text-xl" />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-sm">
              {t("footer.description")}
            </p>
            {(settings?.contact_email || settings?.contact_phone || settings?.address) && (
              <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
                {settings?.contact_email && (
                  <li className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 shrink-0 text-primary" />
                    <a href={`mailto:${settings.contact_email}`} className="hover:text-foreground transition-colors break-all">
                      {settings.contact_email}
                    </a>
                  </li>
                )}
                {settings?.contact_phone && (
                  <li className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 shrink-0 text-primary" />
                    <a href={`tel:${settings.contact_phone}`} className="hover:text-foreground transition-colors">
                      {settings.contact_phone}
                    </a>
                  </li>
                )}
                {settings?.address && (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                    <span>{settings.address}</span>
                  </li>
                )}
              </ul>
            )}
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link to={link.path} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">{t("footer.copyright")}</p>
          <div className="flex items-center gap-2">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="icon-btn w-9 h-9 border border-border text-muted-foreground hover:text-primary hover:border-primary/40"
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
