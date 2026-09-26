'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const images = [
  '/image1.jpeg',
  '/image2.jpeg'
]

export function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={`Hero image ${index + 1}`}
          fill
          className={`object-cover transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          priority={index === 0}
        />
      ))}
      {/* Overlay gradient to ensure text/badges pop */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent pointer-events-none" />
    </>
  )
}
