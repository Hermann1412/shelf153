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

  return (
    <footer className="glass border-t border-[hsla(var(--glass-border))] mt-16">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand & Contact */}
          <div className="lg:col-span-1">
            <Logo className="mb-4" />
            <p className="text-muted-foreground mb-6">
              {t("footer.description")}
            </p>
            <div className="space-y-3">
              {settings?.contact_email && (
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Mail className="w-5 h-5 text-primary" />
                  <span>{settings.contact_email}</span>
                </div>
              )}
              {settings?.contact_phone && (
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Phone className="w-5 h-5 text-primary" />
                  <span>{settings.contact_phone}</span>
                </div>
              )}
              {settings?.address && (
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>{settings.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {t("footer.company")}
            </h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {t("footer.customerService")}
            </h3>
            <ul className="space-y-2">
              {footerLinks.customer.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {t("footer.legal")}
            </h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="glass-panel mb-12">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t("footer.stayConnected")}
            </h3>
            <p className="text-muted-foreground">
              {t("footer.newsletterText")}
            </p>
          </div>
          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder={t("footer.emailPlaceholder")}
              className="flex-1 px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder-muted-foreground"
            />
            <button
              type="submit"
              className="px-6 py-3 gradient-primary text-primary-foreground rounded-lg hover:glow-on-hover animate-smooth font-semibold"
            >
              {t("footer.subscribe")}
            </button>
          </form>
        </div>

        {/* Social Links & Copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-[hsla(var(--glass-border))]">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="p-2 glass-card hover:glow-on-hover animate-smooth"
              >
                <social.icon className="w-5 h-5 text-primary" />
              </a>
            ))}
          </div>

          <div className="text-center md:text-right">
            <p className="text-muted-foreground text-sm">
              {t("footer.copyright")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
