// pages/index.js

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import DonationForm from "../components/DonationForm";

export default function Home() {
  const [donateurs, setDonateurs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDonateur, setSelectedDonateur] = useState(null);

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
      {/* Logo */}
      <div className="logo-container">
        <img src="/logo.png" alt="Logo" className="site-logo" />
      </div>

      <div className="wall-container">
        {/* Totaal */}
        <div className="total-box">
          TOTAL DONATED
          <span className="amount">
            {formatCurrency(donateurs.reduce((sum, d) => sum + d.bedrag, 0))}
          </span>
        </div>

        {/* Muur met 20 portretten */}
        <div className="wall-grid">
          {donateurs.map((donateur, i) => (
            <div
              key={donateur.id}
              className="portrait-wrapper"
              onClick={() => setSelectedDonateur(donateur)}
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
          ))}
        </div>
      </div>

      {/* Waarom doneren */}
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

      {/* Portrait-modal met frame + nameboard */}
      {selectedDonateur && (
        <div
          className="portrait-modal-overlay"
          onClick={() => setSelectedDonateur(null)}
        >
          <div
            className="portrait-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              onClick={() => setSelectedDonateur(null)}
            >
              ×
            </button>

            <div className="portrait-wrapper">
              <img
                src={selectedDonateur.foto_url}
                alt={selectedDonateur.naam}
                className="portrait-photo"
              />
              <div className="portrait-frame-overlay" />
              <div className="nameboard">
                <div className="naam">{selectedDonateur.naam}</div>
                <div className="bedrag">
                  {formatCurrency(selectedDonateur.bedrag)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Donation Form */}
      <DonationForm isOpen={showForm} onClose={() => setShowForm(false)} />
    </>
  );
}