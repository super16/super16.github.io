---
title:  "Web Oscilloscope"
slug: "web-oscilloscope"
snippet: "The project is released."
meta: "Web Oscilloscope is an Vue.js single-page application to display different kinds
  of waves with white noise."
---

{% include mathjax.html %}

# {{ page.title }}

**Posted {{ page.date | date: "%B %d, %Y" }}**

* * *

Web Oscilloscope is an Vue.js single-page application to display following kinds
of waves with white noise:

* [Sine Wave](#sine-wave "Sine Wave Function")
* [Square Wave](#square-wave "Square Wave Function")
* [Triangular Wave](#triangular-wave "Triangular Wave Function")
* [Saw Wave](#saw-wave "Saw Wave Function")

Link to [Live demo](/web-oscilloscope "web-oscilloscope Application").

![Web Oscilloscope](/assets/img/canvas.png)

* * *

## Abstract

Using the web interface, select type of wave and change its' value of amplitude and frequency,
also control level of noise. Values are сontroled by range inputs faders.
Types of waves are selected with radio input buttons. Wave is rendered on HTML `canvas` display.
Web Oscilloscope app supports responsive design. Size of canvas are depended from device display
size. Other UI elements have special layout for most common display sizes. 


The basic concept behind this app is digital signal processing of waves that every curve
is made from amount of small samples or lines on the canvas in the case of this app.
Coordinate system of wave has only positive values of *x* axis and full *y* axis.
Every wave is continous range of *x* values until the end of the plane.
Each *y* value is calculated with mathematical function depends on *x* value and
chosen wave type. The mathematical functions of the waves are below.

### Sine Wave

The mathematical function of sine wave is as follows:

{% include sine-wave.html %}

where:

* $A$, amplitude, the peak deviation of the function from zero.
* $F$, frequency, number of samples per wave length.

### Square Wave

The mathematical function of square wave is as follows:

{% include square-wave.html %}

### Triangular Wave

The mathematical function of triangular wave is as follows:

{% include triangular-wave.html %}

### Saw Wave

The mathematical function of saw wave is as follows:

{% include saw-wave.html %}

* * *

## Things to Do

* Add documentation to the code
* Unit tests
* Wave filters & modulators
