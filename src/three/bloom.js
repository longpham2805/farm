// The glow round bright things: three's UnrealBloomPass, except that its result is added to the picture in the output
// pass instead of being blended back into the scene's buffer. That buffer is multisampled, so writing into it again
// made the GPU resolve the whole screen a second time: a quarter of the frame at an iPad's size.
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class BloomPass extends UnrealBloomPass {
  /** UnrealBloomPass.render up to its composite of the blurred mips, in renderTargetsHorizontal[0]; no blend. */
  render(renderer, writeBuffer, readBuffer) {
    renderer.getClearColor(this._oldClearColor);
    this._oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(this.clearColor, 0);

    // The bright parts.
    this.highPassUniforms.tDiffuse.value = readBuffer.texture;
    this.highPassUniforms.luminosityThreshold.value = this.threshold;
    this._fsQuad.material = this.materialHighPassFilter;
    renderer.setRenderTarget(this.renderTargetBright);
    renderer.clear();
    this._fsQuad.render(renderer);

    // Blurred, each mip from the one before.
    let input = this.renderTargetBright;
    for (let i = 0; i < this.nMips; i++) {
      const blur = this.separableBlurMaterials[i];
      this._fsQuad.material = blur;
      blur.uniforms.colorTexture.value = input.texture;
      blur.uniforms.direction.value = UnrealBloomPass.BlurDirectionX;
      renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
      renderer.clear();
      this._fsQuad.render(renderer);
      blur.uniforms.colorTexture.value = this.renderTargetsHorizontal[i].texture;
      blur.uniforms.direction.value = UnrealBloomPass.BlurDirectionY;
      renderer.setRenderTarget(this.renderTargetsVertical[i]);
      renderer.clear();
      this._fsQuad.render(renderer);
      input = this.renderTargetsVertical[i];
    }

    // The mips together.
    this._fsQuad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.bloomStrength.value = this.strength;
    this.compositeMaterial.uniforms.bloomRadius.value = this.radius;
    this.compositeMaterial.uniforms.bloomTintColors.value = this.bloomTintColors;
    renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
    renderer.clear();
    this._fsQuad.render(renderer);

    renderer.setClearColor(this._oldClearColor, this._oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }
}

/** OutputPass with the bloom added to the scene before tone mapping, as UnrealBloomPass's additive blend did. */
export class BloomOutputPass extends OutputPass {
  constructor(bloom) {
    super();
    this.bloom = bloom;
    this.uniforms.tBloom = { value: null };
    this.uniforms.bloomOn = { value: 0 };
    const read = 'gl_FragColor = texture2D( tDiffuse, vUv );';
    const shader = this.material.fragmentShader;
    if (!shader.includes(read)) throw new Error('BloomOutputPass: OutputShader changed');
    this.material.fragmentShader = shader
      .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform sampler2D tBloom;\nuniform float bloomOn;')
      .replace(read, `${read}\ngl_FragColor.rgb += bloomOn * texture2D( tBloom, vUv ).rgb;`);
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    this.uniforms.tBloom.value = this.bloom.renderTargetsHorizontal[0].texture;
    this.uniforms.bloomOn.value = this.bloom.enabled ? 1 : 0;
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }
}
