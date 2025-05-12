// pages/index.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import DonationForm from "../components/DonationForm";

export default function Home() {
  const [donateurs, setDonateurs] = useState([]);
  const [showForm, setShowForm] = useState(false);

  // haal alle donateurs op
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("donateurs")
        .select("*")
        .order("bedrag", { ascending: false });
      if (!error) setDonateurs(data);
    })();
  }, []);

  const formatCurrency = (amount) =>
    Number(amount).toLocaleString("nl-NL", {
      style: "currency",
      currency: "EUR",
    });

  return (
    <>
      {/* Logo bovenaan, gecentreerd */}
      <div className="logo-container">
        <img src="/logo.png" alt="Logo" className="site-logo" />
      </div>

      <div className="wall-container">
      

        <div className="total-box">
          TOTAL DONATED
          <span className="amount">
            {formatCurrency(donateurs.reduce((sum, d) => sum + d.bedrag, 0))}
          </span>
        </div>

        <div className="wall-grid">
          {donateurs.map((donateur, i) => {
            const isPodium1 = i === 0;
            const isPodium2 = i === 1;
            const isPodium3 = i === 2;
            const classNames = [
              "portrait-wrapper",
              isPodium1 && "podium-1",
              (isPodium2 || isPodium3) && "podium-2-3",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={donateur.id}
                className={classNames}
                onClick={() => setShowForm(true)}
              >
                <img
                  src={donateur.foto_url}
                  alt={donateur.naam}
                  className="portrait-photo"
                />
                <div className="portrait-frame-overlay" />
                <div className="nameboard">
                  <div className="naam">{donateur.naam}</div>
                  <div className="bedrag">
                    {formatCurrency(donateur.bedrag)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="why-donate">
        <h2>WHY DONATE?</h2>
        <p>
          Half of your contribution goes directly to charity, making a tangible
          difference in the world. The other half supports the creator of this
          platform, rewarding their vision and drive to dream big and build
          something extraordinary.
        </p>
        <button className="donate-btn" onClick={() => setShowForm(true)}>
          Donate
        </button>
      </section>

      <DonationForm isOpen={showForm} onClose={() => setShowForm(false)} />
    </>
  );
}