// pages/index.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import DonationForm from "../components/DonationForm";

export default function Home() {
  const router = useRouter();
  const { session_id } = router.query;

  const [donateurs, setDonateurs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDonateur, setSelectedDonateur] = useState(null);
  const [thankYouDonateur, setThankYouDonateur] = useState(null);

  // 1) Donateurs inladen
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("donateurs")
        .select("*")
        .order("bedrag", { ascending: false });
      if (!error) setDonateurs(data);
    })();
  }, []);

  // 2) Na Stripe-success: toon bedank-modal
  useEffect(() => {
    if (!session_id || donateurs.length === 0) return;
    (async () => {
      const res = await fetch(
        `/api/retrieve-session?session_id=${session_id}`
      );
      const { session } = await res.json();

      // Alleen bij geslaagde betaling
      if (session.payment_status === "paid") {
        const donationId = session.metadata.donationId;
        const donateur = donateurs.find((d) => d.id === donationId);
        if (donateur) {
          setThankYouDonateur(donateur);
        }
      }
      // cleanup URL
      router.replace("/", undefined, { shallow: true });
    })();
  }, [session_id, donateurs, router]);

  const formatCurrency = (amount) =>
    Number(amount).toLocaleString("nl-NL", {
      style: "currency",
      currency: "EUR",
    });

  // 3) Share via Canvas en Web Share API / fallback download
  const handleShare = async () => {
    if (!thankYouDonateur) return;
    // Select de tile in de thank-you modal
    const tile = document.querySelector(
      ".thank-you-modal .portrait-tile"
    );
    const width = tile.offsetWidth;
    const height = tile.offsetHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // 3.1 frame
    const frameImg = new Image();
    frameImg.src = "/photoframe.png";
    await new Promise((r) => (frameImg.onload = r));
    ctx.drawImage(frameImg, 0, 0, width, height);

    // 3.2 foto
    const photoImg = new Image();
    photoImg.crossOrigin = "anonymous";
    photoImg.src = thankYouDonateur.foto_url;
    await new Promise((r) => (photoImg.onload = r));
    const photoHeight = height * 0.8;
    ctx.drawImage(photoImg, 0, 0, width, photoHeight);

    // 3.3 nameboard
    const boardImg = new Image();
    boardImg.src = "/nameboard.png";
    await new Promise((r) => (boardImg.onload = r));
    ctx.drawImage(boardImg, 0, photoHeight, width, height - photoHeight);

    // 3.4 tekst
    ctx.fillStyle = "#111";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      thankYouDonateur.naam,
      width / 2,
      photoHeight + 30
    );
    ctx.fillText(
      formatCurrency(thankYouDonateur.bedrag),
      width / 2,
      photoHeight + 60
    );

    // 3.5 delen of downloaden
    canvas.toBlob(async (blob) => {
      const file = new File([blob], "EWallOfFame.png", {
        type: "image/png",
      });
      const files = [file];
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files,
          title: "E-Wall of Fame Donation",
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "EWallOfFame.png";
        link.click();
        URL.revokeObjectURL(url);
      }
    }, "image/png");
  };

  return (
    <>
      {/* Logo */}
      <div className="logo-container">
        <img
          src="/logo.png"
          alt="Logo"
          className="site-logo"
        />
      </div>

      {/* Wall + Total */}
      <div className="wall-container">
        <div className="total-box">
          TOTAL DONATED
          <span className="amount">
            {formatCurrency(
              donateurs.reduce((sum, d) => sum + d.bedrag, 0)
            )}
          </span>
        </div>
        <div className="wall-grid">
          {donateurs.map((donateur) => (
            <div
              key={donateur.id}
              className="portrait-tile"
              onClick={() =>
                setSelectedDonateur(donateur)
              }
            >
              <div className="portrait-content">
                <img
                  src={donateur.foto_url}
                  alt={donateur.naam}
                  className="portrait-photo"
                />
                <div className="nameboard">
                  <div className="naam">
                    {donateur.naam}
                  </div>
                  <div className="bedrag">
                    {formatCurrency(donateur.bedrag)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why donate */}
      <section className="why-donate">
        <h2>WHY DONATE?</h2>
        <p>
          Half of your contribution goes directly to
          charity, making a tangible difference in the
          world. The other half supports the creator of
          this platform…
        </p>
        <button
          className="donate-btn"
          onClick={() => setShowForm(true)}
        >
          Donate
        </button>
      </section>

      {/* Bedank-modal */}
      {thankYouDonateur && (
        <div
          className="thank-you-modal-overlay"
          onClick={() =>
            setThankYouDonateur(null)
          }
        >
          <div
            className="thank-you-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Bedankt voor je donatie!</h2>
            <div className="portrait-tile portrait-modal-tile">
              <div className="portrait-content">
                <img
                  src={thankYouDonateur.foto_url}
                  alt={thankYouDonateur.naam}
                  className="portrait-photo"
                />
                <div className="nameboard">
                  <div className="naam">
                    {thankYouDonateur.naam}
                  </div>
                  <div className="bedrag">
                    {formatCurrency(
                      thankYouDonateur.bedrag
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button onClick={handleShare}>
              Deel op Instagram
            </button>
            <button
              className="close-modal"
              onClick={() =>
                setThankYouDonateur(null)
              }
            >
              Sluit
            </button>
          </div>
        </div>
      )}

      {/* Portrait-modal (bij klik) *)
      {selectedDonateur &&
        !thankYouDonateur && (
          <div
            className="portrait-modal-overlay"
            onClick={() =>
              setSelectedDonateur(null)
            }
          >
            <div
              className="portrait-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close-modal"
                onClick={() =>
                  setSelectedDonateur(null)
                }
              >
                ×
              </button>
              <div className="portrait-tile portrait-modal-tile">
                <div className="portrait-content">
                  <img
                    src={selectedDonateur.foto_url}
                    alt={selectedDonateur.naam}
                    className="portrait-photo"
                  />
                  <div className="nameboard">
                    <div className="naam">
                      {selectedDonateur.naam}
                    </div>
                    <div className="bedrag">
                      {formatCurrency(
                        selectedDonateur.bedrag
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Donation Form */}
      <DonationForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
      />
    </>
  );
}