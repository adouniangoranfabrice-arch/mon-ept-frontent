const PATHS = {
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 018 0v4",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  calendar: "M4 5h16v16H4zM4 10h16M9 3v4M15 3v4",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  grade: "M4 20V11M10 20V5M16 20v-6M22 20H2",
  student: "M22 9L12 4 2 9l10 5 10-5zM6 11.5V16c3 2.5 9 2.5 12 0v-4.5M22 9v6",
  file: "M14 3H6v18h12V7l-4-4zM14 3v4h4M9 13h6M9 17h6",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5",
  users: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 3.5a4 4 0 010 7.5M22 21c0-3-1.5-5-4-5.7",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  x: "M6 6l12 12M18 6L6 18",
  download: "M12 3v12M7 10l5 5 5-5M4 21h16",
  upload: "M12 21V9M7 14l5-5 5 5M4 3h16",
  check: "M5 12l5 5L20 7",
  refresh: "M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0012 3l3-4M19 9A7 7 0 007 6L4 10",
  menu: "M4 6h16M4 12h16M4 18h16",
  alert: "M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 001.7 3h16.6a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
};

export default function Icon({ name, size = 18, className = "", strokeWidth = 2 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
