import SwiftUI

struct PortalView: View {
    @State private var selectedTab = 0
    @State private var isClockedIn = false
    @State private var isLoadingClock = false
    
    var onLogout: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Top App Bar
            HStack {
                VStack(alignment: .leading) {
                    Text("Bluevolt")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(Theme.sassTextPrimary)
                    Text(NetworkClient.shared.getUserName() ?? "Employee")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Theme.sassTextSecondary)
                }
                
                Spacer()
                
                Button(action: toggleClockStatus) {
                    HStack {
                        Image(systemName: isClockedIn ? "stop.circle.fill" : "play.circle.fill")
                        Text(isClockedIn ? "Clock Out" : "Clock In")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(isClockedIn ? Theme.sassDanger.opacity(0.1) : Theme.sassSuccess.opacity(0.1))
                    .foregroundColor(isClockedIn ? Theme.sassDanger : Theme.sassSuccess)
                    .cornerRadius(20)
                }
                .disabled(isLoadingClock)
            }
            .padding()
            .background(Theme.sassCard)
            .shadow(color: Theme.sassTextPrimary.opacity(0.05), radius: 5, x: 0, y: 5)
            
            // Main Content Area
            ZStack {
                switch selectedTab {
                case 0: HomeView()
                case 1: TasksView()
                case 2: NotificationsView()
                case 3: ProfileView()
                case 4: MenuView(onLogout: onLogout)
                default: HomeView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            
            // Custom Bottom Navigation Bar
            HStack {
                BottomNavItem(icon: "house.fill", title: "Home", isSelected: selectedTab == 0) { selectedTab = 0 }
                Spacer()
                BottomNavItem(icon: "checkmark.circle.fill", title: "Tasks", isSelected: selectedTab == 1) { selectedTab = 1 }
                Spacer()
                BottomNavItem(icon: "bell.fill", title: "Alerts", isSelected: selectedTab == 2) { selectedTab = 2 }
                Spacer()
                BottomNavItem(icon: "person.crop.circle.fill", title: "Profile", isSelected: selectedTab == 3) { selectedTab = 3 }
                Spacer()
                BottomNavItem(icon: "line.3.horizontal", title: "Menu", isSelected: selectedTab == 4) { selectedTab = 4 }
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(Theme.sassCard)
            .shadow(color: Theme.sassTextPrimary.opacity(0.05), radius: 10, x: 0, y: -5)
        }
        .background(Theme.sassBackground.ignoresSafeArea())
    }
    
    private func toggleClockStatus() {
        isLoadingClock = true
        Task {
            do {
                if isClockedIn {
                    let _ = try await NetworkClient.shared.clockOut()
                } else {
                    let _ = try await NetworkClient.shared.clockIn()
                }
                await MainActor.run {
                    isClockedIn.toggle()
                    isLoadingClock = false
                }
            } catch {
                await MainActor.run {
                    isLoadingClock = false
                }
            }
        }
    }
}

struct BottomNavItem: View {
    let icon: String
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                Text(title)
                    .font(.system(size: 10, weight: .medium))
            }
            .foregroundColor(isSelected ? Theme.sassPrimary : Theme.sassTextSecondary.opacity(0.6))
        }
    }
}
