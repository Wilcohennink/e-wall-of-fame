
import '../styles/globals.css';   // ← hier alléén je global CSS

export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}