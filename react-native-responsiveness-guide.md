# React Native Responsiveness — Copilot Instructions

## Context
Yeh ek React Native project hai. Mujhe apni app ko **responsive** banana hai taaki woh
har screen size pe theek dikhe — phone, tablet, portrait aur landscape dono mein.

---

## ✅ KYA KARNA HAI (DO THIS)

### 1. Dimensions ke liye `useWindowDimensions` hook use karo
```js
import { useWindowDimensions } from 'react-native';

const { width, height } = useWindowDimensions();
// Yeh auto-update hota hai jab device rotate ho
```

### 2. Width/Height ke liye percentage use karo — `react-native-responsive-screen`
```js
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const styles = StyleSheet.create({
  container: {
    width: wp('90%'),
    paddingVertical: hp('2%'),
  },
  button: {
    width: wp('80%'),
    height: hp('6%'),
  }
});
```

### 3. Font size ke liye `react-native-size-matters` use karo
```js
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const styles = StyleSheet.create({
  heading: { fontSize: moderateScale(20) },
  body:    { fontSize: moderateScale(14) },
  icon:    { width: scale(24), height: scale(24) },
  card:    { height: verticalScale(80) },
});
```

**Functions ka matlab:**
- `scale(n)` → horizontal scaling (widths, icon sizes)
- `verticalScale(n)` → vertical scaling (heights, paddings)
- `moderateScale(n)` → fonts ke liye best — zyada extreme nahi hota

### 4. Layout ke liye Flexbox use karo
```js
container: {
  flex: 1,
  flexDirection: 'row',
  flexWrap: 'wrap',      // Chhoti screen pe wrap ho jaye
  justifyContent: 'space-between',
}
```

### 5. Tablet aur Phone ke liye alag styles
```js
import { Platform, useWindowDimensions } from 'react-native';

const { width } = useWindowDimensions();
const isTablet = width >= 768;

const styles = StyleSheet.create({
  text: {
    fontSize: isTablet ? moderateScale(18) : moderateScale(14),
  }
});
```

---

## ❌ KYA NAHI KARNA HAI (DON'T DO THIS)

### 1. Hardcoded pixel values mat use karo
```js
// ❌ GALAT — sirf ek device pe theek lagega
width: 375
height: 812
fontSize: 16

// ✅ SAHI
width: wp('90%')
fontSize: moderateScale(16)
```

### 2. `Dimensions.get()` directly component mein mat likhoo
```js
// ❌ GALAT — rotate hone pe update nahi hoga
const { width } = Dimensions.get('window');

// ✅ SAHI — hook use karo
const { width } = useWindowDimensions();
```

### 3. Fixed `lineHeight` mat do without scaling
```js
// ❌ GALAT
lineHeight: 24

// ✅ SAHI
lineHeight: moderateScale(24)
```

### 4. `position: absolute` ke saath hardcoded `top/left` mat use karo
```js
// ❌ GALAT
position: 'absolute', top: 50, left: 20

// ✅ SAHI
position: 'absolute', top: hp('6%'), left: wp('5%')
```

---

## 📦 Required Libraries

```bash
npm install react-native-responsive-screen
npm install react-native-size-matters
```

---

## 📁 File Structure Suggestion

Ek alag `theme/metrics.js` file banao:

```js
// theme/metrics.js
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';

export const metrics = {
  screenPadding: wp('5%'),
  buttonWidth: wp('80%'),
  buttonHeight: hp('6%'),
  cardRadius: moderateScale(12),
};

export const fonts = {
  small:   moderateScale(12),
  body:    moderateScale(14),
  medium:  moderateScale(16),
  heading: moderateScale(20),
  title:   moderateScale(24),
};
```

Phir import karo:
```js
import { metrics, fonts } from '../theme/metrics';

fontSize: fonts.body
width: metrics.buttonWidth
```

---

## 🧠 Quick Rule of Thumb

| Kya set karna hai | Kya use karo |
|---|---|
| Width, padding horizontal | `wp('%')` |
| Height, padding vertical | `hp('%')` |
| Font size | `moderateScale(n)` |
| Icon / image size | `scale(n)` |
| Card / container height | `verticalScale(n)` |
| Layout structure | `flex` + `flexDirection` |
