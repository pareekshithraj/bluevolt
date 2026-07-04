"use client";

import React, { useState } from "react";
import Reveal from "@/components/Reveal";
import { Mail, Phone, MapPin, Send } from "lucide-react";

type SubmitState = "idle" | "submitting" | "success" | "error";

type ContactFormData = {
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  interest: string;
  message: string;
  website: string;
};

const defaultForm: ContactFormData = {
  firstName: "",
  lastName: "",
  email: "",
  organization: "",
  interest: "Schools24",
  message: "",
  website: "",
};

export default function ContactPage() {
  const [formState, setFormState] = useState<SubmitState>("idle");
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState<ContactFormData>(defaultForm);

  const onChange =
    (field: keyof ContactFormData) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
      setFormData((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setFormState("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !result.success) {
        setFormError(result.error || "Unable to submit request.");
        setFormState("error");
        return;
      }

      setFormState("success");
      setFormData(defaultForm);
    } catch {
      setFormError("Network error. Please try again.");
      setFormState("error");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <section
        style={{
          paddingTop: "10rem",
          paddingBottom: "6rem",
          paddingLeft: "2rem",
          paddingRight: "2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "4rem",
            alignItems: "center",
          }}
        >
          <Reveal delay={0.2}>
            <div>
              <h1
                style={{
                  fontSize: "clamp(3rem, 5vw, 4rem)",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  marginBottom: "1.5rem",
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                }}
              >
                Transform Your <br />
                <span style={{ color: "var(--accent)" }}>Campus Operations</span>
              </h1>
              <p
                style={{
                  fontSize: "1.25rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  marginBottom: "2rem",
                }}
              >
                Connect with our global sales team to discover how BLUEVOLT can
                synchronize your institution&apos;s digital infrastructure.
              </p>

              <div
                style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    color: "var(--text-primary)",
                  }}
                >
                  <div
                    style={{
                      background: "var(--bg-secondary)",
                      padding: "0.75rem",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent)",
                    }}
                  >
                    <Mail size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>Sales Inquiries</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                      Pareekshithraj@schools24.in
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    color: "var(--text-primary)",
                  }}
                >
                  <div
                    style={{
                      background: "var(--bg-secondary)",
                      padding: "0.75rem",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent)",
                    }}
                  >
                    <Phone size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>Global Support</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                      +91 9110893850
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-main)",
                borderRadius: "var(--radius-lg)",
                padding: "3rem",
                boxShadow: "var(--shadow-lg)",
                position: "relative",
              }}
            >
              {formState === "success" ? (
                <div style={{ textAlign: "center", padding: "3rem 0" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      background: "var(--accent-light)",
                      color: "var(--accent)",
                      borderRadius: "50%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      margin: "0 auto 1.5rem",
                    }}
                  >
                    <Send size={32} />
                  </div>
                  <h3
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      marginBottom: "0.5rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    Message Received
                  </h3>
                  <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
                    A regional deployment specialist will contact you shortly.
                  </p>
                  <button
                    onClick={() => setFormState("idle")}
                    type="button"
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border-main)",
                      padding: "0.75rem 2rem",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    Send Another Request
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
                  aria-label="Contact sales form"
                >
                  <h3
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      marginBottom: "1rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    Request a Demonstration
                  </h3>

                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={onChange("website")}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: "absolute", left: "-10000px", opacity: 0 }}
                  />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "1.5rem",
                    }}
                  >
                    <div>
                      <label
                        htmlFor="firstName"
                        style={{
                          display: "block",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        First Name
                      </label>
                      <input
                        required
                        id="firstName"
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        value={formData.firstName}
                        onChange={onChange("firstName")}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-main)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--text-primary)",
                          outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="lastName"
                        style={{
                          display: "block",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Last Name
                      </label>
                      <input
                        required
                        id="lastName"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        value={formData.lastName}
                        onChange={onChange("lastName")}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-main)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--text-primary)",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      style={{
                        display: "block",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Work Email
                    </label>
                    <input
                      required
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={onChange("email")}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-main)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="organization"
                      style={{
                        display: "block",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Institution / Organization
                    </label>
                    <input
                      required
                      id="organization"
                      name="organization"
                      type="text"
                      autoComplete="organization"
                      value={formData.organization}
                      onChange={onChange("organization")}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-main)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="interest"
                      style={{
                        display: "block",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Primary Interest
                    </label>
                    <select
                      id="interest"
                      name="interest"
                      value={formData.interest}
                      onChange={onChange("interest")}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-main)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option>Schools24</option>
                      <option>Events24</option>
                      <option>Life OS</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      style={{
                        display: "block",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Message (Optional)
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      maxLength={2000}
                      value={formData.message}
                      onChange={onChange("message")}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-main)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                  </div>

                  <p
                    role="status"
                    aria-live="polite"
                    style={{
                      margin: 0,
                      color: formState === "error" ? "#b91c1c" : "var(--text-secondary)",
                      fontSize: "0.88rem",
                      minHeight: "1.25rem",
                    }}
                  >
                    {formState === "error" ? formError : ""}
                  </p>

                  <button
                    type="submit"
                    disabled={formState === "submitting"}
                    style={{
                      background: "var(--accent)",
                      color: "white",
                      border: "none",
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      fontWeight: 600,
                      cursor: formState === "submitting" ? "not-allowed" : "pointer",
                      opacity: formState === "submitting" ? 0.7 : 1,
                      transition: "all 0.2s",
                      marginTop: "0.25rem",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {formState === "submitting" ? "Submitting..." : "Submit Request"}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <section
        style={{
          padding: "6rem 2rem",
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Reveal delay={0.2}>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <h2
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 800,
                  marginBottom: "1rem",
                  color: "var(--text-primary)",
                }}
              >
                Global Presence
              </h2>
              <p
                style={{
                  fontSize: "1.1rem",
                  color: "var(--text-secondary)",
                  maxWidth: "600px",
                  margin: "0 auto",
                }}
              >
                Operating hubs spanning key educational markets.
              </p>
            </div>
          </Reveal>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "2rem",
            }}
          >
            <Reveal delay={0.3}>
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-main)",
                  padding: "2.5rem",
                  borderRadius: "var(--radius-lg)",
                  height: "100%",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <MapPin size={32} color="var(--accent)" style={{ marginBottom: "1.5rem" }} />
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    marginBottom: "1rem",
                    color: "var(--text-primary)",
                  }}
                >
                  North America
                </h3>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>
                  100 Innovation Drive
                  <br />
                  San Francisco, CA 94105
                  <br />
                  United States
                </p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=100+Innovation+Drive+San+Francisco+CA+94105"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}
                >
                  Get Directions &rarr;
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.4}>
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-main)",
                  padding: "2.5rem",
                  borderRadius: "var(--radius-lg)",
                  height: "100%",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <MapPin size={32} color="var(--accent)" style={{ marginBottom: "1.5rem" }} />
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    marginBottom: "1rem",
                    color: "var(--text-primary)",
                  }}
                >
                  Europe
                </h3>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>
                  25 Canary Wharf
                  <br />
                  London E14 5AB
                  <br />
                  United Kingdom
                </p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=25+Canary+Wharf+London+E14+5AB"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}
                >
                  Get Directions &rarr;
                </a>
              </div>
            </Reveal>
            <Reveal delay={0.5}>
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-main)",
                  padding: "2.5rem",
                  borderRadius: "var(--radius-lg)",
                  height: "100%",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <MapPin size={32} color="var(--accent)" style={{ marginBottom: "1.5rem" }} />
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    marginBottom: "1rem",
                    color: "var(--text-primary)",
                  }}
                >
                  Asia Pacific
                </h3>
                <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>
                  Marina Bay Financial Centre
                  <br />
                  Singapore 018981
                  <br />
                  Singapore
                </p>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Marina+Bay+Financial+Centre+Singapore+018981"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}
                >
                  Get Directions &rarr;
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
