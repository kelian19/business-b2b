import { Archivo, Public_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import ScrollProgress from '@/components/ScrollProgress';
import MotionProvider from '@/components/MotionProvider';

// Polices auto-hébergées par Next : aucune requête vers Google chez le visiteur.
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--f-archivo', display: 'swap' });
const publicSans = Public_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--f-public', display: 'swap' });
const plex = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--f-plex', display: 'swap' });

export const metadata = {
  title: 'Équerre : facture électronique et IA pour PME',
  description: "Équerre : un dossier facture électronique (fichiers clients et modèles de factures contrôlés avant septembre 2027) et Le Décodeur (tâches répétitives à automatiser, avec prototype), pour les PME. Prix fixe annoncé avant de commencer.",
  robots: { index: false, follow: false }, // noindex tant que le lancement n'est pas validé
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${archivo.variable} ${publicSans.variable} ${plex.variable}`}>
      <body>
        <a className="skip" href="#contenu">Aller au contenu</a>
        <MotionProvider>
          <SmoothScroll />
          <ScrollProgress />
          {children}
        </MotionProvider>
      </body>
    </html>
  );
}
