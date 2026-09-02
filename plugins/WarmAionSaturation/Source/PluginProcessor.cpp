#include "PluginProcessor.h"
#include "PluginEditor.h"

WarmAionSaturationAudioProcessor::WarmAionSaturationAudioProcessor()
#ifndef JucePlugin_PreferredChannelConfigurations
     : AudioProcessor (BusesProperties()
                     #if ! JucePlugin_IsMidiEffect
                      #if ! JucePlugin_IsSynth
                       .withInput  ("Input",  juce::AudioChannelSet::stereo(), true)
                      #endif
                       .withOutput ("Output", juce::AudioChannelSet::stereo(), true)
                     #endif
                       ),
       apvts(*this, nullptr, "Parameters", createParameterLayout())
#endif
{
}

WarmAionSaturationAudioProcessor::~WarmAionSaturationAudioProcessor() {}

juce::AudioProcessorValueTreeState::ParameterLayout WarmAionSaturationAudioProcessor::createParameterLayout()
{
    std::vector<std::unique_ptr<juce::RangedAudioParameter>> params;

    params.push_back(std::make_unique<juce::AudioParameterFloat>("DRIVE", "Drive", 1.0f, 10.0f, 2.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("CUTOFF", "Warmth (LPF)", 200.0f, 20000.0f, 15000.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("TONE", "Tilt Tone", 0.0f, 1.0f, 0.5f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("BIAS", "Asymmetry", 0.0f, 0.5f, 0.05f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("WIDTH", "Stereo Width", 0.0f, 2.0f, 1.0f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("REVERB", "Reverb", 0.0f, 1.0f, 0.2f));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("DUCK", "Sidechain", 0.0f, 1.0f, 0.0f));
    params.push_back(std::make_unique<juce::AudioParameterChoice>("PRESET", "Preset", juce::StringArray {
        "Custom", "Tube Warmth", "Tape Crush", "Wide Air", "Subtle Glow", "Pumping Space",
        "Lo-Fi Hip Hop", "Cinematic Orchestral", "Techno Pulse", "Dream Pop", "Vintage Soul"
    }, 0));
    params.push_back(std::make_unique<juce::AudioParameterFloat>("MIX", "Mix", 0.0f, 1.0f, 1.0f));
    params.push_back(std::make_unique<juce::AudioParameterChoice>("MODEL", "Core Engine", juce::StringArray { "Linear", "808 Sub", "Bell Piano", "Nebula Pad", "Pulse Lead" }, 0));

    return { params.begin(), params.end() };
}

void WarmAionSaturationAudioProcessor::prepareToPlay (double sampleRate, int samplesPerBlock)
{
    lastSampleL = 0.0f;
    lastSampleR = 0.0f;

    oversampler = std::make_unique<juce::dsp::Oversampling<float>>(
        getTotalNumInputChannels(), 2, juce::dsp::Oversampling<float>::filterHalfBandPolyphaseIIR, true);

    oversampler->initProcessing(samplesPerBlock);

    reverb.setSampleRate(sampleRate);

    juce::dsp::ProcessSpec spec;
    spec.sampleRate = sampleRate;
    spec.maximumBlockSize = samplesPerBlock;
    spec.numChannels = getTotalNumInputChannels();
    limiter.prepare(spec);
    limiter.setThreshold(-0.5f);
    limiter.setRelease(50.0f);

    visualizerBuffer.setSize(getTotalNumInputChannels(), samplesPerBlock);
    visualizerBuffer.clear();
}

void WarmAionSaturationAudioProcessor::releaseResources() {}

bool WarmAionSaturationAudioProcessor::isBusesLayoutSupported (const BusesLayout& layouts) const
{
    if (layouts.getMainOutputChannelSet() != juce::AudioChannelSet::mono()
     && layouts.getMainOutputChannelSet() != juce::AudioChannelSet::stereo())
        return false;

    return layouts.getMainOutputChannelSet() == layouts.getMainInputChannelSet();
}

void WarmAionSaturationAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages)
{
    juce::ScopedNoDenormals noDenormals;

    // Handle Presets
    auto presetIndex = (int)apvts.getRawParameterValue("PRESET")->load();
    if (presetIndex > 0)
    {
        if (presetIndex == 1) { // Tube Warmth
            apvts.getParameter("DRIVE")->setValueNotifyingHost(apvts.getParameter("DRIVE")->convertTo0to1(3.5f));
            apvts.getParameter("CUTOFF")->setValueNotifyingHost(apvts.getParameter("CUTOFF")->convertTo0to1(12000.0f));
            apvts.getParameter("TONE")->setValueNotifyingHost(apvts.getParameter("TONE")->convertTo0to1(0.4f));
            apvts.getParameter("BIAS")->setValueNotifyingHost(apvts.getParameter("BIAS")->convertTo0to1(0.15f));
            apvts.getParameter("WIDTH")->setValueNotifyingHost(apvts.getParameter("WIDTH")->convertTo0to1(1.1f));
            apvts.getParameter("REVERB")->setValueNotifyingHost(apvts.getParameter("REVERB")->convertTo0to1(0.15f));
            apvts.getParameter("DUCK")->setValueNotifyingHost(apvts.getParameter("DUCK")->convertTo0to1(0.0f));
        } else if (presetIndex == 2) { // Tape Crush
            apvts.getParameter("DRIVE")->setValueNotifyingHost(apvts.getParameter("DRIVE")->convertTo0to1(7.0f));
            apvts.getParameter("CUTOFF")->setValueNotifyingHost(apvts.getParameter("CUTOFF")->convertTo0to1(6500.0f));
            apvts.getParameter("TONE")->setValueNotifyingHost(apvts.getParameter("TONE")->convertTo0to1(0.35f));
            apvts.getParameter("BIAS")->setValueNotifyingHost(apvts.getParameter("BIAS")->convertTo0to1(0.35f));
            apvts.getParameter("WIDTH")->setValueNotifyingHost(apvts.getParameter("WIDTH")->convertTo0to1(0.9f));
            apvts.getParameter("REVERB")->setValueNotifyingHost(apvts.getParameter("REVERB")->convertTo0to1(0.2f));
            apvts.getParameter("DUCK")->setValueNotifyingHost(apvts.getParameter("DUCK")->convertTo0to1(0.0f));
        } else if (presetIndex == 3) { // Wide Air
            apvts.getParameter("DRIVE")->setValueNotifyingHost(apvts.getParameter("DRIVE")->convertTo0to1(1.5f));
            apvts.getParameter("CUTOFF")->setValueNotifyingHost(apvts.getParameter("CUTOFF")->convertTo0to1(18000.0f));
            apvts.getParameter("TONE")->setValueNotifyingHost(apvts.getParameter("TONE")->convertTo0to1(0.65f));
            apvts.getParameter("BIAS")->setValueNotifyingHost(apvts.getParameter("BIAS")->convertTo0to1(0.02f));
            apvts.getParameter("WIDTH")->setValueNotifyingHost(apvts.getParameter("WIDTH")->convertTo0to1(1.8f));
            apvts.getParameter("REVERB")->setValueNotifyingHost(apvts.getParameter("REVERB")->convertTo0to1(0.4f));
            apvts.getParameter("DUCK")->setValueNotifyingHost(apvts.getParameter("DUCK")->convertTo0to1(0.0f));
        } else if (presetIndex == 4) { // Subtle Glow
            apvts.getParameter("DRIVE")->setValueNotifyingHost(apvts.getParameter("DRIVE")->convertTo0to1(2.2f));
            apvts.getParameter("CUTOFF")->setValueNotifyingHost(apvts.getParameter("CUTOFF")->convertTo0to1(14000.0f));
            apvts.getParameter("TONE")->setValueNotifyingHost(apvts.getParameter("TONE")->convertTo0to1(0.55f));
            apvts.getParameter("BIAS")->setValueNotifyingHost(apvts.getParameter("BIAS")->convertTo0to1(0.08f));
            apvts.getParameter("WIDTH")->setValueNotifyingHost(apvts.getParameter("WIDTH")->convertTo0to1(1.05f));
            apvts.getParameter("REVERB")->setValueNotifyingHost(apvts.getParameter("REVERB")->convertTo0to1(0.1f));
            apvts.getParameter("DUCK")->setValueNotifyingHost(apvts.getParameter("DUCK")->convertTo0to1(0.2f));
        } else if (presetIndex == 5) { // Pumping Space
            apvts.getParameter("DRIVE")->setValueNotifyingHost(apvts.getParameter("DRIVE")->convertTo0to1(3.0f));
            apvts.getParameter("CUTOFF")->setValueNotifyingHost(apvts.getParameter("CUTOFF")->convertTo0to1(10000.0f));
            apvts.getParameter("TONE")->setValueNotifyingHost(apvts.getParameter("TONE")->convertTo0to1(0.5f));
            apvts.getParameter("BIAS")->setValueNotifyingHost(apvts.getParameter("BIAS")->convertTo0to1(0.1f));
            apvts.getParameter("WIDTH")->setValueNotifyingHost(apvts.getParameter("WIDTH")->convertTo0to1(1.4f));
            apvts.getParameter("REVERB")->setValueNotifyingHost(apvts.getParameter("REVERB")->convertTo0to1(0.6f));
            apvts.getParameter("DUCK")->setValueNotifyingHost(apvts.getParameter("DUCK")->convertTo0to1(0.8f));
        } else if (presetIndex == 6) { // Lo-Fi Hip Hop
            apvts.getParameter("DRIVE")->setValueNotifyingHost(apvts.getParameter("DRIVE")->convertTo0to1(5.5f));
            apvts.getParameter("CUTOFF")->setValueNotifyingHost(apvts.getParameter("CUTOFF")->convertTo0to1(4500.0f));
            apvts.getParameter("TONE")->setValueNotifyingHost(apvts.getParameter("TONE")->convertTo0to1(0.3f));
            apvts.getParameter("BIAS")->setValueNotifyingHost(apvts.getParameter("BIAS")->convertTo0to1(0.45f));
            apvts.getParameter("WIDTH")->setValueNotifyingHost(apvts.getParameter("WIDTH")->convertTo0to1(0.85f));
            apvts.getParameter("REVERB")->setValueNotifyingHost(apvts.getParameter("REVERB")->convertTo0to1(0.25f));
            apvts.getParameter("DUCK")->setValueNotifyingHost(apvts.getParameter("DUCK")->convertTo0to1(0.1f));
        } else if (presetIndex == 7) { // Cinematic Orchestral
            apvts.getParameter("DRIVE")->setValueNotifyingHost(apvts.getParameter("DRIVE")->convertTo0to1(1.2f));
            apvts.getParameter("CUTOFF")->setValueNotifyingHost(apvts.getParameter("CUTOFF")->convertTo0to1(20000.0f));
            apvts.getParameter("TONE")->setValueNotifyingHost(apvts.getParameter("TONE")->convertTo0to1(0.6f));
            apvts.getParameter("BIAS")->setValueNotifyingHost(apvts.getParameter("BIAS")->convertTo0to1(0.01f));
            apvts.getParameter("WIDTH")->setValueNotifyingHost(apvts.getParameter("WIDTH")->convertTo0to1(1.95f));
            apvts.getParameter("REVERB")->setValueNotifyingHost(apvts.getParameter("REVERB")->convertTo0to1(0.75f));
            apvts.getParameter("DUCK")->setValueNotifyingHost(apvts.getParameter("DUCK")->convertTo0to1(0.0f));
        } else if (presetIndex == 8) { // Techno Pulse
            apvts.getParameter("DRIVE")->setValueNotifyingHost(apvts.getParameter("DRIVE")->convertTo0to1(9.0f));
            apvts.getParameter("CUTOFF")->setValueNotifyingHost(apvts.getParameter("CUTOFF")->convertTo0to1(12000.0f));
            apvts.getParameter("TONE")->setValueNotifyingHost(apvts.getParameter("TONE")->convertTo0to1(0.55f));
            apvts.getParameter("BIAS")->setValueNotifyingHost(apvts.getParameter("BIAS")->convertTo0to1(0.2f));
            apvts.getParameter("WIDTH")->setValueNotifyingHost(apvts.getParameter("WIDTH")->convertTo0to1(1.0f));
            apvts.getParameter("REVERB")->setValueNotifyingHost(apvts.getParameter("REVERB")->convertTo0to1(0.1f));
            apvts.getParameter("DUCK")->setValueNotifyingHost(apvts.getParameter("DUCK")->convertTo0to1(1.0f));
        } else if (presetIndex == 9) { // Dream Pop
            apvts.getParameter("DRIVE")->setValueNotifyingHost(apvts.getParameter("DRIVE")->convertTo0to1(2.5f));
            apvts.getParameter("CUTOFF")->setValueNotifyingHost(apvts.getParameter("CUTOFF")->convertTo0to1(16000.0f));
            apvts.getParameter("TONE")->setValueNotifyingHost(apvts.getParameter("TONE")->convertTo0to1(0.7f));
            apvts.getParameter("BIAS")->setValueNotifyingHost(apvts.getParameter("BIAS")->convertTo0to1(0.05f));
            apvts.getParameter("WIDTH")->setValueNotifyingHost(apvts.getParameter("WIDTH")->convertTo0to1(1.7f));
            apvts.getParameter("REVERB")->setValueNotifyingHost(apvts.getParameter("REVERB")->convertTo0to1(0.65f));
            apvts.getParameter("DUCK")->setValueNotifyingHost(apvts.getParameter("DUCK")->convertTo0to1(0.3f));
        } else if (presetIndex == 10) { // Vintage Soul
            apvts.getParameter("DRIVE")->setValueNotifyingHost(apvts.getParameter("DRIVE")->convertTo0to1(4.0f));
            apvts.getParameter("CUTOFF")->setValueNotifyingHost(apvts.getParameter("CUTOFF")->convertTo0to1(8000.0f));
            apvts.getParameter("TONE")->setValueNotifyingHost(apvts.getParameter("TONE")->convertTo0to1(0.45f));
            apvts.getParameter("BIAS")->setValueNotifyingHost(apvts.getParameter("BIAS")->convertTo0to1(0.3f));
            apvts.getParameter("WIDTH")->setValueNotifyingHost(apvts.getParameter("WIDTH")->convertTo0to1(0.95f));
            apvts.getParameter("REVERB")->setValueNotifyingHost(apvts.getParameter("REVERB")->convertTo0to1(0.2f));
            apvts.getParameter("DUCK")->setValueNotifyingHost(apvts.getParameter("DUCK")->convertTo0to1(0.0f));
        }
        apvts.getParameter("PRESET")->setValueNotifyingHost(0.0f);
    }

    auto totalNumInputChannels  = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear (i, 0, buffer.getNumSamples());

    float drive = apvts.getRawParameterValue("DRIVE")->load();
    float cutoff = apvts.getRawParameterValue("CUTOFF")->load();
    float tone = apvts.getRawParameterValue("TONE")->load();
    float bias = apvts.getRawParameterValue("BIAS")->load();
    float width = apvts.getRawParameterValue("WIDTH")->load();
    float revAmount = apvts.getRawParameterValue("REVERB")->load();
    float duckAmount = apvts.getRawParameterValue("DUCK")->load();
    float mix = apvts.getRawParameterValue("MIX")->load();
    int modelIndex = (int)apvts.getRawParameterValue("MODEL")->load();

    juce::AudioBuffer<float> dryBuffer;
    dryBuffer.makeCopyOf(buffer);

    // 1. Oversampling UP
    juce::dsp::AudioBlock<float> block(buffer);
    auto oversampledBlock = oversampler->processSamplesUp(block);
    float oversampledRate = (float)getSampleRate() * oversampler->getOversamplingFactor();
    float dt = 1.0f / oversampledRate;
    float rc = 1.0f / (2.0f * juce::MathConstants<float>::pi * cutoff);
    float alpha = dt / (rc + dt);

    for (int channel = 0; channel < oversampledBlock.getNumChannels(); ++channel)
    {
        auto* channelData = oversampledBlock.getChannelPointer(channel);
        float& lastSample = (channel == 0) ? lastSampleL : lastSampleR;
        for (int sample = 0; sample < oversampledBlock.getNumSamples(); ++sample)
        {
            float input = channelData[sample];

            // 2. Core Engine Processing (Nebula-Series Non-Linear Shapers)
            if (modelIndex == 1) { // 808 Sub Shaper
                input = std::tanh(input * 3.5f) * (1.1f - std::exp(-std::abs(input) * 8.0f));
            } else if (modelIndex == 2) { // Bell Piano Shaper (Cyber-Additive)
                input = input + std::sin(input * 3.1415f) * 0.15f + std::sin(input * 6.283f) * 0.05f;
            } else if (modelIndex == 3) { // Nebula Pad Shaper (Ethereal Clouds)
                input = input * (0.75f + 0.25f * std::sin((float)sample * 0.0005f + (float)channel * 1.57f));
            } else if (modelIndex == 4) { // Pulse Lead Shaper (Sharp Edge)
                input = (input > 0.0f) ? std::pow(input, 0.8f) : -std::pow(std::abs(input), 0.8f);
            }

            float biasedInput = input + bias;
            float saturated = std::tanh(biasedInput * drive) / std::tanh(drive);
            saturated -= std::tanh(bias * drive) / std::tanh(drive);
            float filtered = alpha * saturated + (1.0f - alpha) * lastSample;
            lastSample = filtered;
            channelData[sample] = filtered;
        }
    }

    // 2. Oversampling DOWN
    oversampler->processSamplesDown(block);

    // 3. Reverb
    juce::Reverb::Parameters revParams;
    revParams.roomSize = 0.8f;
    revParams.damping = 0.5f;
    revParams.wetLevel = revAmount;
    revParams.dryLevel = 1.0f - revAmount;
    revParams.width = width;
    reverb.setParameters(revParams);
    if (totalNumInputChannels == 2)
        reverb.processStereo(buffer.getWritePointer(0), buffer.getWritePointer(1), buffer.getNumSamples());
    else
        reverb.processMono(buffer.getWritePointer(0), buffer.getNumSamples());

    // 4. Stereo Width, Ducking, Tone
    if (totalNumInputChannels == 2)
    {
        auto* leftData = buffer.getWritePointer(0);
        auto* rightData = buffer.getWritePointer(1);
        for (int sample = 0; sample < buffer.getNumSamples(); ++sample)
        {
            float left = leftData[sample];
            float right = rightData[sample];
            float mid = (left + right) * 0.5f;
            float side = (left - right) * 0.5f;
            side *= width;
            float env = std::abs(mid);
            float duck = 1.0f - (env * duckAmount);
            mid *= std::max(0.1f, duck);
            side *= std::max(0.1f, duck);

            // Tilt Tone
            float lpL = 0.1f * (mid + side) + 0.9f * lastSampleL;
            float hpL = (mid + side) - lpL;
            leftData[sample] = lpL * (1.0f + (0.5f - tone)) + hpL * (1.0f + (tone - 0.5f));

            float lpR = 0.1f * (mid - side) + 0.9f * lastSampleR;
            float hpR = (mid - side) - lpR;
            rightData[sample] = lpR * (1.0f + (0.5f - tone)) + hpR * (1.0f + (tone - 0.5f));
        }
    }

    // 5. Limiter
    juce::dsp::AudioBlock<float> limiterBlock(buffer);
    juce::dsp::ProcessContextReplacing<float> limiterContext(limiterBlock);
    limiter.process(limiterContext);

    // 6. Final Mix
    for (int channel = 0; channel < totalNumInputChannels; ++channel)
    {
        auto* outData = buffer.getWritePointer(channel);
        auto* dryData = dryBuffer.getReadPointer(channel);
        for (int sample = 0; sample < buffer.getNumSamples(); ++sample)
            outData[sample] = (outData[sample] * mix) + (dryData[sample] * (1.0f - mix));
    }

    for (int ch = 0; ch < totalNumInputChannels; ++ch)
        visualizerBuffer.copyFrom(ch, 0, buffer, ch, 0, buffer.getNumSamples());
}

const juce::String WarmAionSaturationAudioProcessor::getName() const { return JucePlugin_Name; }
bool WarmAionSaturationAudioProcessor::acceptsMidi() const { return false; }
bool WarmAionSaturationAudioProcessor::producesMidi() const { return false; }
bool WarmAionSaturationAudioProcessor::isMidiEffect() const { return false; }
double WarmAionSaturationAudioProcessor::getTailLengthSeconds() const { return 0.0; }
int WarmAionSaturationAudioProcessor::getNumPrograms() { return 1; }
int WarmAionSaturationAudioProcessor::getCurrentProgram() { return 0; }
void WarmAionSaturationAudioProcessor::setCurrentProgram (int index) {}
const juce::String WarmAionSaturationAudioProcessor::getProgramName (int index) { return {}; }
void WarmAionSaturationAudioProcessor::changeProgramName (int index, const juce::String& newName) {}

void WarmAionSaturationAudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    auto state = apvts.copyState();
    std::unique_ptr<juce::XmlElement> xml(state.createXml());
    copyXmlToBinary(*xml, destData);
}

void WarmAionSaturationAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    std::unique_ptr<juce::XmlElement> xmlState(getXmlFromBinary(data, sizeInBytes));
    if (xmlState.get() != nullptr && xmlState->hasTagName(apvts.state.getType()))
        apvts.replaceState(juce::ValueTree::fromXml(*xmlState));
}

juce::AudioProcessorEditor* WarmAionSaturationAudioProcessor::createEditor()
{
    return new WarmAionSaturationAudioProcessorEditor (*this);
}

bool WarmAionSaturationAudioProcessor::hasEditor() const { return true; }

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new WarmAionSaturationAudioProcessor();
}
