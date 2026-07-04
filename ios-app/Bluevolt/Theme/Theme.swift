import SwiftUI

enum Theme {
    // Premium SaaS Color System matching Android Color.kt
    static val sassPrimary = Color(hex: 0x2563EB)
    static val sassSecondary = Color(hex: 0x3B82F6)
    static val sassAccent = Color(hex: 0x60A5FA)
    static val sassSuccess = Color(hex: 0x10B981)
    static val sassWarning = Color(hex: 0xF59E0B)
    static val sassDanger = Color(hex: 0xEF4444)
    static val sassBackground = Color(hex: 0xF8FAFC)
    static val sassCard = Color(hex: 0xFFFFFF)
    static val sassTextPrimary = Color(hex: 0x0F172A)
    static val sassTextSecondary = Color(hex: 0x64748B)
    static val sassDivider = Color(hex: 0x0F172A).opacity(0.08)
}

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 08) & 0xff) / 255,
            blue: Double((hex >> 00) & 0xff) / 255,
            opacity: alpha
        )
    }
}

// Typography Equivalents
extension Font {
    static var sassPageTitle: Font {
        .system(size: 28, weight: .bold, design: .default)
    }
    static var sassCardTitle: Font {
        .system(size: 20, weight: .semibold, design: .default)
    }
    static var sassBodyLarge: Font {
        .system(size: 16, weight: .regular, design: .default)
    }
    static var sassBody: Font {
        .system(size: 14, weight: .regular, design: .default)
    }
    static var sassCaption: Font {
        .system(size: 12, weight: .medium, design: .default)
    }
}
