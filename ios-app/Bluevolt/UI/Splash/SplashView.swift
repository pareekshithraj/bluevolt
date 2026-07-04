import SwiftUI

struct SplashView: View {
    @State private var opacity = 0.0
    var onSplashFinished: () -> Void
    
    var body: some View {
        ZStack {
            Theme.sassBackground.ignoresSafeArea()
            
            VStack {
                // Note: Add a "logo" image to your Assets.xcassets in Xcode
                Image("logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 120, height: 120)
                
                Spacer().frame(height: 24)
                
                Text("BLUEVOLT")
                    .font(Theme.sassPageTitle)
                    .fontWeight(.heavy)
                    .foregroundColor(Theme.sassTextPrimary)
                    .tracking(2)
                
                Spacer().frame(height: 8)
                
                Text("Enterprise OS")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.sassTextPrimary.opacity(0.5))
                    .tracking(1)
            }
            .opacity(opacity)
            .onAppear {
                withAnimation(.easeInOut(duration: 1.0)) {
                    opacity = 1.0
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) {
                    onSplashFinished()
                }
            }
        }
    }
}
