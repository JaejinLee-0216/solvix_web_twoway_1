export default function Footer() {
  return (
    <footer className="container-1200 relative" style={{ height: 106 }}>
      <div className="absolute left-[182px] top-[31px] w-[153px] h-[42px] bg-[url('/assets/desktop/nav_logo.png')] bg-contain bg-no-repeat" />
      {/* Social icons */}
      <a
        href="https://www.instagram.com/solvix_neoq/"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute left-[889px] top-[37px]"
        aria-label="SOLVIX Instagram"
      >
        <img src="/assets/desktop/footer_icon_instagram.svg" alt="instagram" width={30} height={30} />
      </a>
      <a
        href="https://www.youtube.com/@NeoQ-Study"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute left-[932px] top-[37px]"
        aria-label="SOLVIX YouTube"
      >
        <img src="/assets/desktop/footer_icon_youtube.svg" alt="youtube" width={39} height={27} />
      </a>
      <a
        href="https://www.linkedin.com/in/%EC%9E%AC%EC%A7%84-%EC%9D%B4-a898b8378/"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute left-[986px] top-[37px]"
        aria-label="SOLVIX LinkedIn"
      >
        <img src="/assets/desktop/footer_icon_linkedin.svg" alt="linkedin" width={30} height={30} />
      </a>
    </footer>
  );
}

