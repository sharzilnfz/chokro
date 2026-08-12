import re
import os

def process_create_listing():
    path = '/Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/CreateListingScreen.tsx'
    with open(path, 'r') as f:
        content = f.read()

    content = content.replace("import { colors, radii, shadows } from '../theme';", "import { colors } from '../theme';")
    content = re.sub(r"\bStyleSheet,\s*", "", content)
    
    replacements = [
        (r'style=\{styles\.container\}', 'className="flex-1 bg-background"'),
        (r'contentContainerStyle=\{styles\.content\}', 'contentContainerClassName="p-[20px] pb-[36px]"'),
        (r'style=\{styles\.eyebrow\}', 'className="text-leaf text-[11px] font-extrabold tracking-[1.3px]"'),
        (r'style=\{styles\.title\}', 'className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]"'),
        (r'style=\{styles\.subtitle\}', 'className="text-muted text-[14px] leading-[21px] mt-[7px] mb-[22px]"'),
        (r'style=\{styles\.section\}', 'className="bg-surface border border-border rounded-md p-[16px] mb-[13px] shadow-card" style={{ elevation: 2 }}'),
        (r'style=\{styles\.sectionHeading\}', 'className="flex-row items-center gap-[9px] mb-[13px]"'),
        (r'style=\{styles\.sectionNumber\}', 'className="text-leaf text-[11px] font-black tracking-[0.8px]"'),
        (r'style=\{styles\.sectionTitle\}', 'className="text-ink text-[17px] font-extrabold"'),
        (r'style=\{styles\.photoWrap\}', 'className="h-[220px] rounded-[14px] overflow-hidden bg-surface-muted"'),
        (r'style=\{styles\.photo\}', 'className="w-full h-full" style={{ resizeMode: \'cover\' }}'),
        (r'style=\{\(\{ pressed \}\} => \[styles\.removePhoto, pressed && styles\.pressed\]\}', 'className="absolute top-[8px] right-[8px] w-[48px] h-[48px] rounded-[24px] bg-overlay items-center justify-center active:opacity-[0.72]"'),
        (r'style=\{\(\{ pressed \}\} => \[styles\.photoPicker, pressed && styles\.pressed\]\}', 'className="min-h-[150px] border border-dashed border-leaf rounded-[14px] bg-leaf-soft items-center justify-center p-[18px] active:opacity-[0.72]"'),
        (r'style=\{styles\.photoPickerTitle\}', 'className="text-leaf-dark text-[16px] font-extrabold mt-[7px]"'),
        (r'style=\{styles\.photoPickerCopy\}', 'className="text-muted text-[12px] leading-[18px] text-center mt-[4px]"'),
        (r'style=\{styles\.options\}', 'className="flex-row flex-wrap gap-[8px]"'),
        (r'style=\{\(\{ pressed \}\} => \[styles\.chip, selected && styles\.chipActive, pressed && styles\.pressed\]\}', 'className={`min-h-[48px] px-[13px] rounded-pill border items-center justify-center active:opacity-[0.74] ${selected ? \'bg-leaf-soft border-leaf\' : \'bg-background border-border\'}`}'),
        (r'style=\{\[styles\.chipText, selected && styles\.chipTextActive\]\}', 'className={`text-[13px] font-bold ${selected ? \'text-leaf-dark\' : \'text-muted\'}`}'),
        (r'style=\{styles\.quantityRow\}', 'className="flex-row"'),
        (r'style=\{styles\.quantityInput\}', 'className="flex-1 min-h-[52px] border border-r-0 border-border rounded-tl-[12px] rounded-bl-[12px] bg-background text-ink text-[17px] px-[14px]"'),
        (r'style=\{styles\.unitBox\}', 'className="min-w-[88px] min-h-[52px] border border-border rounded-tr-[12px] rounded-br-[12px] bg-surface-muted items-center justify-center px-[12px]"'),
        (r'style=\{styles\.unitText\}', 'className="text-ink text-[14px] font-extrabold"'),
        (r'style=\{styles\.helper\}', 'className="text-muted text-[12px] leading-[18px] mt-[7px]"'),
        (r'style=\{styles\.statusRow\}', 'className="min-h-[48px] flex-row items-center gap-[8px] border-t border-border mt-[14px] pt-[12px]"'),
        (r'style=\{styles\.statusText\}', 'className="text-muted text-[13px] font-bold"'),
        (r'style=\{styles\.error\}', 'className="text-danger bg-danger-soft p-[13px] rounded-[12px] text-[14px] leading-[20px] font-semibold mb-[12px]"'),
        (r'style=\{styles\.notice\}', 'className="text-leaf-dark bg-leaf-soft p-[13px] rounded-[12px] text-[14px] leading-[20px] font-semibold mb-[12px]"'),
        (r'style=\{\(\{ pressed \}\} => \[styles\.publishButton, pressed && styles\.pressed, \(loading \|\| preparingPhoto\) && styles\.disabled\]\}', 'className={`min-h-[54px] rounded-[15px] bg-leaf items-center justify-center mt-[3px] active:opacity-[0.74] ${(loading || preparingPhoto) ? \'opacity-[0.55]\' : \'\'}`}'),
        (r'style=\{styles\.publishText\}', 'className="text-surface text-[16px] font-extrabold"'),
    ]
    for old, new in replacements:
        content = re.sub(old, new, content)

    content = re.sub(r'\nconst styles = StyleSheet\.create\(\{[\s\S]*?\}\);\n', '\n', content)
    with open(path, 'w') as f:
        f.write(content)


def process_wallet():
    path = '/Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/WalletScreen.tsx'
    with open(path, 'r') as f:
        content = f.read()

    content = content.replace("import { colors, radii, shadows } from '../theme';", "import { colors } from '../theme';")
    content = re.sub(r"\bStyleSheet,\s*", "", content)
    
    replacements = [
        (r'style=\{styles\.container\}', 'className="flex-1 bg-background"'),
        (r'contentContainerStyle=\{styles\.content\}', 'contentContainerClassName="p-[20px] pb-[36px]"'),
        (r'style=\{styles\.centered\}', 'className="flex-1 items-center justify-center bg-background p-[28px]"'),
        (r'style=\{styles\.eyebrow\}', 'className="text-leaf text-[11px] font-extrabold tracking-[1.3px]"'),
        (r'style=\{styles\.title\}', 'className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]"'),
        (r'style=\{styles\.subtitle\}', 'className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]"'),
        (r'style=\{styles\.verifiedCard\}', 'className="bg-leaf-dark rounded-lg p-[20px] min-h-[190px] justify-end shadow-card" style={{ elevation: 2 }}'),
        (r'style=\{styles\.balanceIcon\}', 'className="absolute top-[18px] right-[18px] w-[48px] h-[48px] rounded-[16px] bg-leaf items-center justify-center"'),
        (r'style=\{styles\.verifiedLabel\}', 'className="text-[#BBD5C5] text-[11px] font-extrabold tracking-[1.2px]"'),
        (r'style=\{styles\.verifiedAmount\}', 'className="text-surface text-[47px] leading-[53px] font-extrabold tracking-[-1.8px] mt-[4px]"'),
        (r'style=\{styles\.verifiedUnit\}', 'className="text-[#DCEADF] text-[13px] font-semibold"'),
        (r'style=\{styles\.pendingCard\}', 'className="flex-row items-center justify-between gap-[14px] border border-[#E4C991] rounded-md bg-amber-soft p-[16px] mt-[12px]"'),
        (r'style=\{styles\.pendingLabel\}', 'className="text-amber text-[14px] font-extrabold"'),
        (r'style=\{styles\.pendingCopy\}', 'className="text-muted text-[11px] leading-[16px] mt-[3px] max-w-[230px]"'),
        (r'style=\{styles\.pendingAmount\}', 'className="text-amber text-[24px] font-extrabold"'),
        (r'style=\{styles\.inlineError\}', 'className="text-danger bg-danger-soft p-[12px] rounded-[10px] mt-[12px] text-[13px] leading-[19px]"'),
        (r'style=\{styles\.sectionTitle\}', 'className="text-ink text-[18px] font-extrabold mt-[24px] mb-[10px]"'),
        (r'style=\{styles\.transaction\}', 'className="min-h-[78px] flex-row items-center bg-surface border border-border rounded-md p-[13px] mb-[9px] shadow-card" style={{ elevation: 2 }}'),
        (r'style=\{\[styles\.transactionIcon, \{ backgroundColor: isDebit \? colors\.dangerSoft : colors\.leafSoft \}\]\}', 'className={`w-[44px] h-[44px] rounded-[14px] items-center justify-center ${isDebit ? \'bg-danger-soft\' : \'bg-leaf-soft\'}`}'),
        (r'style=\{styles\.transactionBody\}', 'className="flex-1 mx-[11px]"'),
        (r'style=\{styles\.transactionKind\}', 'className="text-ink text-[14px] font-extrabold"'),
        (r'style=\{\[styles\.transactionStatus, \{ color: statusColor \}\]\}', 'className="text-[11px] font-extrabold mt-[2px]" style={{ color: statusColor }}'),
        (r'style=\{styles\.reason\}', 'className="text-muted text-[11px] leading-[16px] mt-[2px]"'),
        (r'style=\{\[styles\.transactionAmount, isDebit && styles\.redeemAmount\]\}', 'className={`text-[16px] font-extrabold ${isDebit ? \'text-danger\' : \'text-leaf-dark\'}`}'),
        (r'style=\{styles\.emptyBox\}', 'className="items-center p-[28px] border border-border rounded-md bg-surface"'),
        (r'style=\{styles\.emptyTitle\}', 'className="text-ink text-[16px] font-extrabold mt-[9px]"'),
        (r'style=\{styles\.emptyCopy\}', 'className="text-muted text-[13px] leading-[19px] text-center mt-[5px]"'),
        (r'style=\{styles\.stateTitle\}', 'className="text-ink text-[18px] font-extrabold text-center mt-[11px]"'),
        (r'style=\{styles\.stateCopy\}', 'className="text-muted text-[14px] leading-[20px] text-center mt-[6px]"'),
        (r'style=\{\(\{ pressed \}\} => \[styles\.retryButton, pressed && styles\.pressed\]\}', 'className="min-w-[132px] min-h-[48px] rounded-[14px] bg-leaf items-center justify-center mt-[16px] active:opacity-[0.72]"'),
        (r'style=\{styles\.retryText\}', 'className="text-surface text-[14px] font-extrabold"'),
    ]
    for old, new in replacements:
        content = re.sub(old, new, content)

    content = re.sub(r'\nconst styles = StyleSheet\.create\(\{[\s\S]*?\}\);\n', '\n', content)
    with open(path, 'w') as f:
        f.write(content)

def process_qr():
    path = '/Users/sharzilnafis/Desktop/Project/chokro/apps/mobile/src/screens/QRScannerScreen.tsx'
    with open(path, 'r') as f:
        content = f.read()

    content = content.replace("import { colors, radii, shadows } from '../theme';", "import { colors } from '../theme';")
    content = re.sub(r"\bStyleSheet,\s*", "", content)
    
    replacements = [
        (r'style=\{styles\.container\}', 'className="flex-1 bg-background"'),
        (r'contentContainerStyle=\{styles\.content\}', 'contentContainerClassName="p-[20px] pb-[36px]"'),
        (r'style=\{styles\.eyebrow\}', 'className="text-leaf text-[11px] font-extrabold tracking-[1.3px]"'),
        (r'style=\{styles\.title\}', 'className="text-ink text-[31px] leading-[37px] font-extrabold tracking-tight mt-[4px]"'),
        (r'style=\{styles\.subtitle\}', 'className="text-muted text-[14px] leading-[21px] mt-[6px] mb-[18px]"'),
        (r'style=\{styles\.cameraState\}', 'className="h-[300px] rounded-lg bg-surface-muted items-center justify-center"'),
        (r'style=\{styles\.cameraStateText\}', 'className="text-muted text-[13px] mt-[9px]"'),
        (r'style=\{styles\.permissionCard\}', 'className="min-h-[260px] border border-border rounded-lg bg-surface items-center justify-center p-[24px] shadow-card" style={{ elevation: 2 }}'),
        (r'style=\{styles\.permissionTitle\}', 'className="text-ink text-[18px] font-extrabold mt-[10px]"'),
        (r'style=\{styles\.permissionCopy\}', 'className="text-muted text-[13px] leading-[20px] text-center mt-[6px] mb-[15px]"'),
        (r'style=\{\(\{ pressed \}\} => \[styles\.primaryButton, pressed && styles\.pressed\]\}', 'className="min-w-[170px] min-h-[50px] rounded-[14px] bg-leaf items-center justify-center active:opacity-[0.72]"'),
        (r'style=\{styles\.primaryText\}', 'className="text-surface text-[15px] font-extrabold"'),
        (r'style=\{styles\.cameraShell\}', 'className="h-[310px] rounded-lg overflow-hidden bg-ink shadow-card" style={{ elevation: 2 }}'),
        (r'style=\{styles\.camera\}', 'className="flex-1"'),
        (r'style=\{styles\.cameraOverlay\}', 'className="absolute top-0 right-0 bottom-0 left-0 items-center justify-center bg-[#0a160f]/16"'),
        (r'style=\{styles\.scanFrame\}', 'className="w-[205px] h-[205px] border-[3px] border-surface rounded-[22px]"'),
        (r'style=\{styles\.cameraHint\}', 'className="absolute bottom-[18px] text-surface text-[12px] font-extrabold bg-overlay px-[12px] py-[8px] rounded-pill overflow-hidden"'),
        (r'style=\{styles\.manualCard\}', 'className="bg-surface border border-border rounded-md p-[15px] mt-[13px]"'),
        (r'style=\{styles\.manualTitle\}', 'className="text-ink text-[14px] font-extrabold mb-[8px]"'),
        (r'style=\{styles\.input\}', 'className="min-h-[52px] border border-border rounded-[12px] bg-background text-ink text-[14px] px-[13px] mb-[9px]"'),
        (r'style=\{\(\{ pressed \}\} => \[styles\.resolveButton, pressed && styles\.pressed, loading && styles\.disabled\]\}', 'className={`min-h-[50px] rounded-[13px] bg-leaf items-center justify-center active:opacity-[0.72] ${loading ? \'opacity-[0.55]\' : \'\'}`}'),
        (r'style=\{styles\.errorCard\}', 'className="flex-row items-start gap-[10px] bg-danger-soft rounded-md p-[14px] mt-[13px]"'),
        (r'style=\{styles\.messageBody\}', 'className="flex-1"'),
        (r'style=\{styles\.errorTitle\}', 'className="text-danger text-[14px] font-extrabold"'),
        (r'style=\{styles\.errorText\}', 'className="text-danger text-[12px] leading-[18px] mt-[2px]"'),
        (r'style=\{\(\{ pressed \}\} => \[styles\.iconButton, pressed && styles\.pressed\]\}', 'className="w-[48px] h-[48px] rounded-[15px] items-center justify-center active:opacity-[0.72]"'),
        (r'style=\{styles\.zoneCard\}', 'className="bg-surface border border-leaf rounded-lg p-[19px] mt-[13px] shadow-card" style={{ elevation: 2 }}'),
        (r'style=\{styles\.zoneIcon\}', 'className="w-[48px] h-[48px] rounded-[16px] bg-leaf items-center justify-center mb-[14px]"'),
        (r'style=\{styles\.zoneEyebrow\}', 'className="text-leaf text-[10px] font-black tracking-[1.2px]"'),
        (r'style=\{styles\.zoneName\}', 'className="text-ink text-[23px] leading-[29px] font-extrabold mt-[4px]"'),
        (r'style=\{styles\.statusBadge\}', 'className="self-start min-h-[32px] flex-row items-center gap-[6px] bg-leaf-soft rounded-pill px-[11px] mt-[10px]"'),
        (r'style=\{styles\.statusDot\}', 'className="w-[7px] h-[7px] rounded-[4px] bg-leaf"'),
        (r'style=\{styles\.statusText\}', 'className="text-leaf-dark text-[11px] font-extrabold"'),
        (r'style=\{styles\.acceptedLabel\}', 'className="text-ink text-[13px] font-extrabold mt-[18px] mb-[8px]"'),
        (r'style=\{styles\.categoryRow\}', 'className="flex-row flex-wrap gap-[7px]"'),
        (r'style=\{styles\.categoryChip\}', 'className="min-h-[36px] rounded-pill bg-surface-muted items-center justify-center px-[11px]"'),
        (r'style=\{styles\.categoryText\}', 'className="text-ink text-[11px] font-bold"'),
        (r'style=\{styles\.unknownText\}', 'className="text-muted text-[12px] leading-[18px]"'),
        (r'style=\{styles\.scopeNotice\}', 'className="flex-row items-start gap-[8px] bg-amber-soft rounded-[12px] p-[12px] mt-[16px]"'),
        (r'style=\{styles\.scopeText\}', 'className="flex-1 text-amber text-[12px] leading-[18px] font-bold"'),
        (r'style=\{\(\{ pressed \}\} => \[styles\.secondaryButton, pressed && styles\.pressed\]\}', 'className="min-h-[50px] flex-row items-center justify-center gap-[8px] border border-leaf rounded-[14px] mt-[13px] active:opacity-[0.72]"'),
        (r'style=\{styles\.secondaryText\}', 'className="text-leaf-dark text-[14px] font-extrabold"'),
    ]
    for old, new in replacements:
        content = re.sub(old, new, content)

    content = re.sub(r'\nconst styles = StyleSheet\.create\(\{[\s\S]*?\}\);\n', '\n', content)
    with open(path, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    process_create_listing()
    process_wallet()
    process_qr()
