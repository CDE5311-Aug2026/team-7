import { Icon } from "./components";

export default function LoginPage({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="login-page">
      <section className="login-column" aria-labelledby="login-title">
        <header className="login-brand" aria-label="Fileo">
          FILEO
        </header>
        <div className="login-content">
          <span className="login-eyebrow">A HOME FOR YOUR CREATIVE FILES</span>
          <h1 id="login-title">Welcome to Fileo</h1>
          <p>
            A little clarity for your files.
            <br />
            More space for your next idea.
          </p>
          <button className="button primary login-enter" onClick={onEnter}>
            Enter workspace <Icon name="arrow" size={19} />
          </button>
          <span className="login-caption">
            Your workspace is ready when you are.
          </span>
        </div>
        <footer className="login-footer">
          <span className="live-dot" />
          Demo workspace <span>·</span> Pick up where you left off.
        </footer>
      </section>
      <div className="login-artwork">
        <img
          src="./assets/sign-in-iris.png"
          alt="Purple and peach iris flowers seen through textured glass"
          width="912"
          height="1016"
          fetchPriority="high"
        />
      </div>
    </main>
  );
}
