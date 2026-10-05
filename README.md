# Evaluation interactive

A separate, client-only classroom demo for the Evaluation & Generalization chapter of the course (2026 lecture, printed slides 113–145). No server-side computation, accounts for students, external libraries or data collection.

## Test locally

```bash
cd /Users/alex/Documents/Codex/2026-07-28/evaluation-interactive
python3 -m http.server 3004
```

Visit http://localhost:3004/. Serve over HTTP; opening index.html directly will not load the module worker.

With Node.js 22 or later, `npm test` runs numerical tests and `npm run build` produces `dist/` with a UTC build timestamp. No npm installation step is needed.

## Two controlled experiments

1. **Repeated training:** B independent training samples; all polynomial degrees fitted on the same samples and evaluated at the same fixed test inputs. Display individual fits, an average predictor, ±1 predictor standard deviation, and mean training/fixed-test MSE versus degree. Click the degree curve or numbered buttons to change degree. Click the data plot to probe pointwise bias and variance.
2. **Repeated testing:** freeze predictor #1 and evaluate it on B independent test sets. Display the test-MSE histogram, empirical variance across sets, estimated SE from a selected set’s individual squared losses, and an approximate 95% risk interval. The data-sample slider chooses a training sample in view 1 or a test sample in view 2; it never changes the fixed predictor in view 2.

Controls configure sinusoidal/linear/quadratic truth, amplitude, phase, cycles, offset, input interval, Gaussian noise variance, degree 0–12, training size 16–300, test size 10–1000 and repetitions 20–200. Sizes are separate rather than a coupled fraction, allowing clean one-factor experiments. Resample training, test or all independently.

Both plots have independent Fit axes and Auto-fit controls. Automatic fitting is off by default. Complexity and test-MSE histogram views remember separate limits and auto-fit settings; disabling auto-fit freezes the current limits. Changing log/linear scale preserves the complexity plot's underlying MSE bounds. Out-of-view curves and histogram counts are flagged; histogram observations outside the current limits are not folded into the end bins. Restore defaults resets all axes.

The plots and compact metric rail stay visible in a viewport-sized dashboard. Only the parameter/interpretation pane scrolls: below the two stacked plots in mobile portrait, on the left of the side-by-side plots in mobile landscape and desktop. Detailed explanations, sample selection, visibility options and pointwise readings remain available in that scrolling pane.

## Statistical conventions

- Fresh IID datasets from a known population are used, not repeated overlapping partitions of one finite dataset. Overlap would correlate repeats and confound the independence assumptions in the lecture's uncertainty formulas.
- All models use ordinary least squares. Householder QR on a domain-scaled Legendre basis avoids explicitly inverting the normal equations. Rank failure is shown as an error; models are never silently dropped or regularized.
- Mean predictor and variance at a point use B as denominator. This makes the finite-ensemble squared-error decomposition exact. Bias² has Monte Carlo error (including finite-ensemble mean variance); it is not an unbiased estimator of population squared bias.
- Cards use the fixed test inputs; the displayed smooth bands use a dense grid. Expected error integrates over **new observation noise**, not the realized fixed test labels. Finite noisy fixed-test MSE need not equal the theoretical sum.
- Across-test-set MSE variance and within-set loss variance use B−1 and m−1 respectively. The expected test-MSE SE equals sqrt(Var(loss)/m). Known-population reference risk and loss variance are approximated with 4096-point midpoint integration, using exact Gaussian noise moments.
- The 95% interval is a normal-approximation risk interval for a fixed predictor, not an interval for its predictions. Small m and strongly skewed losses can make coverage poor. No overlapping-fold standard-error interpretation is claimed.
- Model selection on displayed test scores makes these scores validation results. An untouched final test set is needed for real assessment. This app is a teaching simulation, not a model-selection or nested-CV implementation.
- Seeds are separate and fixed until explicitly resampled, so changing degree does not change observations and test controls never change training data. Computation runs in a worker to keep controls responsive.

## GitHub Pages

Create an empty repository `evaluation-interactive` under `alexbernardino`, push this folder to `main`, then choose **Settings → Pages → GitHub Actions**. The included workflow tests, builds and deploys the static `dist/` folder. Expected address: https://alexbernardino.github.io/evaluation-interactive/.

The course PDF is not copied into the public repository. Nothing is pushed automatically.

## QR code for students

Scan to open https://alexbernardino.github.io/evaluation-interactive/ once deployed.

![Open the evaluation demo](qr-evaluation-interactive.png)

The PNG is also included in the published site for use in slides and handouts.
