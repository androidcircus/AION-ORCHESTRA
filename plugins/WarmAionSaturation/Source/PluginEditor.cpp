#include "PluginProcessor.h"
#include "PluginEditor.h"

WarmAionSaturationAudioProcessorEditor::WarmAionSaturationAudioProcessorEditor (WarmAionSaturationAudioProcessor& p)
    : AudioProcessorEditor (&p), audioProcessor (p)
{
    setSize (400, 300);

    driveSlider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    driveSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 50, 20);
    addAndMakeVisible(driveSlider);
    driveAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(audioProcessor.apvts, "DRIVE", driveSlider);

    cutoffSlider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    cutoffSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 50, 20);
    addAndMakeVisible(cutoffSlider);
    cutoffAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(audioProcessor.apvts, "CUTOFF", cutoffSlider);

    toneSlider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    toneSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 50, 20);
    addAndMakeVisible(toneSlider);
    toneAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(audioProcessor.apvts, "TONE", toneSlider);

    biasSlider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    biasSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 50, 20);
    addAndMakeVisible(biasSlider);
    biasAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(audioProcessor.apvts, "BIAS", biasSlider);

    widthSlider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    widthSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 50, 20);
    addAndMakeVisible(widthSlider);
    widthAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(audioProcessor.apvts, "WIDTH", widthSlider);

    reverbSlider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    reverbSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 50, 20);
    addAndMakeVisible(reverbSlider);
    reverbAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(audioProcessor.apvts, "REVERB", reverbSlider);

    duckSlider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    duckSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 50, 20);
    addAndMakeVisible(duckSlider);
    duckAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(audioProcessor.apvts, "DUCK", duckSlider);

    mixSlider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    mixSlider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 50, 20);
    addAndMakeVisible(mixSlider);
    mixAttachment = std::make_unique<juce::AudioProcessorValueTreeState::SliderAttachment>(audioProcessor.apvts, "MIX", mixSlider);

    presetComboBox.addItemList(audioProcessor.apvts.getParameter("PRESET")->getAllValueStrings(), 1);
    addAndMakeVisible(presetComboBox);
    presetAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment>(audioProcessor.apvts, "PRESET", presetComboBox);

    modelComboBox.addItemList(audioProcessor.apvts.getParameter("MODEL")->getAllValueStrings(), 1);
    addAndMakeVisible(modelComboBox);
    modelAttachment = std::make_unique<juce::AudioProcessorValueTreeState::ComboBoxAttachment>(audioProcessor.apvts, "MODEL", modelComboBox);

    startTimerHz(30); // 30 FPS for visualizer
}

WarmAionSaturationAudioProcessorEditor::~WarmAionSaturationAudioProcessorEditor()
{
    stopTimer();
}

void WarmAionSaturationAudioProcessorEditor::timerCallback()
{
    repaint();
}

void WarmAionSaturationAudioProcessorEditor::paint (juce::Graphics& g)
{
    g.fillAll (juce::Colours::black);

    // Cyberpunk Nebula Gradient
    juce::Colour royalBlue = juce::Colour::fromRGBA (0, 35, 255, 255);
    juce::Colour deepPurple = juce::Colour::fromRGBA (188, 0, 255, 255);
    juce::Colour neonCyan = juce::Colour::fromRGBA (0, 240, 255, 255);

    juce::ColourGradient nebulaGrad (royalBlue, 0, 0, deepPurple, (float)getWidth(), (float)getHeight(), true);
    g.setGradientFill (nebulaGrad);
    g.setOpacity (0.15f);
    g.fillAll();
    g.setOpacity (1.0f);

    g.setColour (neonCyan);
    g.setFont (juce::Font ("Orbitron", 28.0f, juce::Font::bold));
    g.drawText ("AION ORCHESTRA", getLocalBounds().removeFromTop (50), juce::Justification::centred, true);

    // Draw Visualizer at the bottom
    auto visArea = getLocalBounds().removeFromBottom (80).toFloat();
    g.setColour (royalBlue.withAlpha (0.4f));

    auto& buffer = audioProcessor.visualizerBuffer;
    if (buffer.getNumSamples() > 0)
    {
        juce::Path wavePath;
        wavePath.startNewSubPath (visArea.getX(), visArea.getCentreY());

        int step = buffer.getNumSamples() / 100;
        if (step < 1) step = 1;

        for (int i = 0; i < buffer.getNumSamples(); i += step)
        {
            float val = buffer.getSample (0, i);
            float x = visArea.getX() + (float)i / buffer.getNumSamples() * visArea.getWidth();
            float y = visArea.getCentreY() + val * (visArea.getHeight() * 0.45f);
            wavePath.lineTo (x, y);
        }

        // Nebula Glow Effect
        g.setColour (neonCyan.withAlpha (0.6f));
        g.strokePath (wavePath, juce::PathStrokeType (2.5f));

        g.setColour (deepPurple.withAlpha (0.2f));
        g.fillPath (wavePath);
    }
}

void WarmAionSaturationAudioProcessorEditor::resized()
{
    auto area = getLocalBounds();

    // Header
    area.removeFromTop(60);

    // Preset Area
    auto presetArea = area.removeFromTop(40).reduced(80, 5);
    presetComboBox.setBounds(presetArea.removeFromLeft(presetArea.getWidth() / 2));
    modelComboBox.setBounds(presetArea);

    auto sliderArea = area.removeFromTop(120);
    int numSliders = 8;
    int sliderWidth = sliderArea.getWidth() / numSliders;

    driveSlider.setBounds(sliderArea.removeFromLeft(sliderWidth));
    cutoffSlider.setBounds(sliderArea.removeFromLeft(sliderWidth));
    toneSlider.setBounds(sliderArea.removeFromLeft(sliderWidth));
    biasSlider.setBounds(sliderArea.removeFromLeft(sliderWidth));
    widthSlider.setBounds(sliderArea.removeFromLeft(sliderWidth));
    reverbSlider.setBounds(sliderArea.removeFromLeft(sliderWidth));
    duckSlider.setBounds(sliderArea.removeFromLeft(sliderWidth));
    mixSlider.setBounds(sliderArea);
}
