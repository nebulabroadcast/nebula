import React from 'react';
import './Navbar.css';

interface NavbarProps {
  children: React.ReactNode;
}

export const Navbar = ({ children }: NavbarProps) => {
  return <nav className="nebula-navbar">{children}</nav>;
};
