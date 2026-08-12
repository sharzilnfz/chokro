import re

def fix_file(path):
    with open(path, 'r') as f:
        content = f.read()

    # CreateListingScreen
    content = re.sub(r'style=\{\(\{ pressed \}\) => \[styles\.removePhoto, pressed && styles\.pressed\]\}', 'className="absolute top-[8px] right-[8px] w-[48px] h-[48px] rounded-[24px] bg-overlay items-center justify-center active:opacity-[0.72]"', content)
    content = re.sub(r'style=\{\(\{ pressed \}\) => \[styles\.photoPicker, pressed && styles\.pressed\]\}', 'className="min-h-[150px] border border-dashed border-leaf rounded-[14px] bg-leaf-soft items-center justify-center p-[18px] active:opacity-[0.72]"', content)
    content = re.sub(r'style=\{\(\{ pressed \}\) => \[styles\.chip, selected && styles\.chipActive, pressed && styles\.pressed\]\}', 'className={`min-h-[48px] px-[13px] rounded-pill border items-center justify-center active:opacity-[0.72] ${selected ? \'bg-leaf-soft border-leaf\' : \'bg-background border-border\'}`}', content)
    content = re.sub(r'style=\{\(\{ pressed \}\) => \[styles\.publishButton, pressed && styles\.pressed, \(loading \|\| preparingPhoto\) && styles\.disabled\]\}', 'className={`min-h-[54px] rounded-[15px] bg-leaf items-center justify-center mt-[3px] active:opacity-[0.72] ${(loading || preparingPhoto) ? \'opacity-[0.55]\' : \'\'}`}', content)
    content = re.sub(r'style=\{\[styles\.chipText, selected && styles\.chipTextActive\]\}', 'className={`text-[13px] font-bold ${selected ? \'text-leaf-dark\' : \'text-muted\'}`}', content)

    # WalletScreen
    content = re.sub(r'style=\{\(\{ pressed \}\) => \[styles\.retryButton, pressed && styles\.pressed\]\}', 'className="min-w-[132px] min-h-[48px] rounded-[14px] bg-leaf items-center justify-center mt-[16px] active:opacity-[0.72]"', content)

    # QRScannerScreen
    content = re.sub(r'style=\{\(\{ pressed \}\) => \[styles\.primaryButton, pressed && styles\.pressed\]\}', 'className="min-w-[170px] min-h-[50px] rounded-[14px] bg-leaf items-center justify-center active:opacity-[0.72]"', content)
    content = re.sub(r'style=\{\(\{ pressed \}\) => \[styles\.resolveButton, pressed && styles\.pressed, loading && styles\.disabled\]\}', 'className={`min-h-[50px] rounded-[13px] bg-leaf items-center justify-center active:opacity-[0.72] ${loading ? \'opacity-[0.55]\' : \'\'}`}', content)
    content = re.sub(r'style=\{\(\{ pressed \}\) => \[styles\.iconButton, pressed && styles\.pressed\]\}', 'className="w-[48px] h-[48px] rounded-[15px] items-center justify-center active:opacity-[0.72]"', content)
    content = re.sub(r'style=\{\(\{ pressed \}\) => \[styles\.secondaryButton, pressed && styles\.pressed\]\}', 'className="min-h-[50px] flex-row items-center justify-center gap-[8px] border border-leaf rounded-[14px] mt-[13px] active:opacity-[0.72]"', content)

    with open(path, 'w') as f:
        f.write(content)

fix_file('/Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/CreateListingScreen.tsx')
fix_file('/Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/WalletScreen.tsx')
fix_file('/Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/QRScannerScreen.tsx')
